import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

interface Relation {
  name: string;
  kind: string;
  rls: boolean;
}

interface Column {
  table: string;
  name: string;
  type: string;
  notNull: boolean;
  hasDefault: boolean;
}

interface Routine {
  signature: string;
  returns: string;
}

interface Grant {
  object: string;
  role: string;
  privilege: string;
}

interface Policy {
  table: string;
  name: string;
  command: string;
  roles: string;
  using: string | null;
  check: string | null;
}

interface EnumType {
  name: string;
  labels: string[];
}

interface Constraint {
  table: string;
  name: string;
  definition: string;
}

interface Snapshot {
  relations: Relation[];
  columns: Column[];
  routines: Routine[];
  grants: Grant[];
  policies: Policy[];
  enums: EnumType[];
  constraints: Constraint[];
}

interface Finding {
  level: 'breaking' | 'review';
  message: string;
}

const SNAPSHOT_SQL = `
with
rels as (
  select c.oid, c.relname, c.relkind, c.relrowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
),
fns as (
  select p.oid, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signature,
    pg_get_function_result(p.oid) as returns
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  left join pg_depend d on d.objid = p.oid and d.deptype = 'e'
  where n.nspname = 'public' and d.objid is null and p.prokind in ('f', 'p')
),
roles as (select unnest(array['anon', 'authenticated', 'service_role']) as role)
select json_build_object(
  'relations', coalesce((select json_agg(json_build_object(
    'name', relname, 'kind', relkind, 'rls', relrowsecurity) order by relname) from rels), '[]'),
  'columns', coalesce((select json_agg(json_build_object(
    'table', r.relname, 'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
    'notNull', a.attnotnull,
    'hasDefault', a.atthasdef or a.attidentity <> '' or a.attgenerated <> '')
    order by r.relname, a.attname)
    from rels r join pg_attribute a on a.attrelid = r.oid
    where a.attnum > 0 and not a.attisdropped), '[]'),
  'routines', coalesce((select json_agg(json_build_object(
    'signature', signature, 'returns', returns) order by signature) from fns), '[]'),
  'grants', coalesce((select json_agg(g order by g->>'object', g->>'role', g->>'privilege') from (
    select json_build_object('object', 'table ' || r.relname, 'role', ro.role, 'privilege', p.privilege) as g
    from rels r cross join roles ro
    cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as p(privilege)
    where has_table_privilege(ro.role, r.oid, p.privilege)
    union all
    select json_build_object('object', 'function ' || f.signature, 'role', ro.role, 'privilege', 'EXECUTE')
    from fns f cross join roles ro
    where has_function_privilege(ro.role, f.oid, 'EXECUTE')
  ) grants), '[]'),
  'policies', coalesce((select json_agg(json_build_object(
    'table', tablename, 'name', policyname, 'command', cmd, 'roles', array_to_string(roles, ','),
    'using', qual, 'check', with_check) order by tablename, policyname)
    from pg_policies where schemaname = 'public'), '[]'),
  'enums', coalesce((select json_agg(json_build_object(
    'name', t.typname,
    'labels', (select json_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid))
    order by t.typname)
    from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e'), '[]'),
  'constraints', coalesce((select json_agg(json_build_object(
    'table', r.relname, 'name', k.conname, 'definition', pg_get_constraintdef(k.oid))
    order by r.relname, k.conname)
    from pg_constraint k join rels r on r.oid = k.conrelid
    where k.contype in ('c', 'u', 'f', 'x')), '[]')
);
`;

const SAFE_WIDENINGS: [RegExp, RegExp][] = [
  [/^smallint$/, /^(integer|bigint|numeric.*)$/],
  [/^integer$/, /^(bigint|numeric.*)$/],
  [/^bigint$/, /^numeric.*$/],
  [/^real$/, /^double precision$/],
  [/^character varying\(\d+\)$/, /^(text|character varying)$/],
  [/^character varying$/, /^text$/],
  [/^json$/, /^jsonb$/],
];

const isSafeWidening = (from: string, to: string) => {
  const varchar = /^character varying\((\d+)\)$/;
  const a = from.match(varchar);
  const b = to.match(varchar);
  if (a && b) return Number(b[1]) >= Number(a[1]);
  return SAFE_WIDENINGS.some(([source, target]) => source.test(from) && target.test(to));
};

const KIND_NAMES: Record<string, string> = {
  r: 'table',
  p: 'table',
  v: 'view',
  m: 'materialized view',
  f: 'foreign table',
};

const byKey = <T>(items: T[], key: (item: T) => string) => new Map(items.map((i) => [key(i), i]));

export const compare = (base: Snapshot, head: Snapshot): Finding[] => {
  const findings: Finding[] = [];
  const breaking = (message: string) => findings.push({ level: 'breaking', message });
  const review = (message: string) => findings.push({ level: 'review', message });

  const baseRelations = byKey(base.relations, (r) => r.name);
  const headRelations = byKey(head.relations, (r) => r.name);
  for (const [name, relation] of baseRelations) {
    const next = headRelations.get(name);
    const kind = KIND_NAMES[relation.kind] ?? relation.kind;
    if (!next) {
      breaking(`${kind} \`${name}\` was dropped or renamed`);
      continue;
    }
    const nextKind = KIND_NAMES[next.kind] ?? next.kind;
    if (kind !== nextKind) breaking(`\`${name}\` changed from a ${kind} to a ${nextKind}`);
    if (!relation.rls && next.rls) {
      review(`row level security was turned on for \`${name}\`; old clients need a policy for it`);
    }
  }

  const columnKey = (c: Column) => `${c.table}.${c.name}`;
  const baseColumns = byKey(base.columns, columnKey);
  const headColumns = byKey(head.columns, columnKey);
  for (const [key, column] of baseColumns) {
    if (!headRelations.has(column.table)) continue;
    const next = headColumns.get(key);
    if (!next) {
      breaking(`column \`${key}\` was dropped or renamed`);
      continue;
    }
    if (column.type !== next.type) {
      const message = `column \`${key}\` changed type from \`${column.type}\` to \`${next.type}\``;
      if (isSafeWidening(column.type, next.type)) review(`${message} (a widening)`);
      else breaking(message);
    }
    if (!column.notNull && next.notNull) breaking(`column \`${key}\` became NOT NULL`);
    if (column.hasDefault && !next.hasDefault && next.notNull) {
      breaking(`column \`${key}\` lost its default but is NOT NULL`);
    }
  }
  for (const [key, column] of headColumns) {
    if (baseColumns.has(key) || !baseRelations.has(column.table)) continue;
    const kind = baseRelations.get(column.table)?.kind;
    if (kind !== 'r' && kind !== 'p') continue;
    if (column.notNull && !column.hasDefault) {
      breaking(`new column \`${key}\` is NOT NULL without a default, so old inserts fail`);
    }
  }

  const baseRoutines = byKey(base.routines, (r) => r.signature);
  const headRoutines = byKey(head.routines, (r) => r.signature);
  for (const [signature, routine] of baseRoutines) {
    const next = headRoutines.get(signature);
    if (!next) {
      breaking(`function \`${signature}\` was dropped, renamed or had its arguments changed`);
      continue;
    }
    if (routine.returns !== next.returns) {
      breaking(
        `function \`${signature}\` now returns \`${next.returns}\` instead of \`${routine.returns}\``,
      );
    }
  }

  const grantKey = (g: Grant) => `${g.object}|${g.role}|${g.privilege}`;
  const headGrants = new Set(head.grants.map(grantKey));
  for (const grant of base.grants) {
    const object = grant.object.replace(/^(table|function) /, '');
    if (!headRelations.has(object) && !headRoutines.has(object)) continue;
    if (!headGrants.has(grantKey(grant))) {
      breaking(`\`${grant.role}\` lost ${grant.privilege} on ${grant.object}`);
    }
  }

  const policyKey = (p: Policy) => `${p.table}.${p.name}`;
  const headPolicies = byKey(head.policies, policyKey);
  const basePolicies = byKey(base.policies, policyKey);
  for (const [key, policy] of basePolicies) {
    if (!headRelations.has(policy.table)) continue;
    const next = headPolicies.get(key);
    if (!next) {
      breaking(`policy \`${key}\` (${policy.command} for ${policy.roles}) was dropped or renamed`);
      continue;
    }
    if (
      policy.command !== next.command ||
      policy.roles !== next.roles ||
      policy.using !== next.using ||
      policy.check !== next.check
    ) {
      review(`policy \`${key}\` changed; check that old clients still pass it`);
    }
  }

  const headEnums = byKey(head.enums, (e) => e.name);
  for (const type of base.enums) {
    const next = headEnums.get(type.name);
    if (!next) {
      breaking(`enum \`${type.name}\` was dropped or renamed`);
      continue;
    }
    for (const label of type.labels) {
      if (!next.labels.includes(label))
        breaking(`enum \`${type.name}\` lost the value \`${label}\``);
    }
  }

  const constraintKey = (c: Constraint) => `${c.table}.${c.name}`;
  const baseConstraints = byKey(base.constraints, constraintKey);
  for (const constraint of head.constraints) {
    if (!baseRelations.has(constraint.table)) continue;
    const before = baseConstraints.get(constraintKey(constraint));
    if (before?.definition === constraint.definition) continue;
    review(
      `constraint \`${constraintKey(constraint)}\` is new or changed (\`${constraint.definition}\`); check that old writers still pass it`,
    );
  }

  return findings;
};

const snapshot = (container: string, out: string) => {
  const json = execFileSync(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-At',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { input: SNAPSHOT_SQL, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  writeFileSync(out, json.trim());
};

const report = (basePath: string, headPath: string, allowBreaking: boolean, summary: string) => {
  const base = JSON.parse(readFileSync(basePath, 'utf8')) as Snapshot;
  const head = JSON.parse(readFileSync(headPath, 'utf8')) as Snapshot;
  const findings = compare(base, head);
  const broken = findings.filter((f) => f.level === 'breaking');
  const reviews = findings.filter((f) => f.level === 'review');

  for (const f of broken) console.log(`  ${allowBreaking ? 'warn' : 'fail'}  ${f.message}`);
  for (const f of reviews) console.log(`  warn  ${f.message}`);
  if (findings.length === 0) console.log('  ok    no backwards incompatible schema changes');

  if (summary) {
    const lines = ['## Migration safety', ''];
    if (findings.length === 0) lines.push('No backwards incompatible schema changes.');
    if (broken.length > 0) {
      lines.push(
        allowBreaking
          ? '**Breaking changes, allowed by the `breaking-migration` label:**'
          : '**Breaking changes** (the shipped app, dashboard and scraper still use these):',
        '',
        ...broken.map((f) => `- ${f.message}`),
        '',
      );
    }
    if (reviews.length > 0) {
      lines.push('**Check by hand:**', '', ...reviews.map((f) => `- ${f.message}`), '');
    }
    appendFileSync(summary, `${lines.join('\n')}\n`);
  }

  if (broken.length > 0 && !allowBreaking) process.exit(1);
};

const [command, ...args] = process.argv.slice(2);
if (command === 'snapshot' && args.length === 2) {
  snapshot(args[0] ?? '', args[1] ?? '');
} else if (command === 'compare' && args.length >= 2) {
  report(args[0] ?? '', args[1] ?? '', args[2] === '1', args[3] ?? '');
} else {
  console.error('Usage: node scripts/dev/db-compat.ts snapshot <container> <out.json>');
  console.error(
    '       node scripts/dev/db-compat.ts compare <base.json> <head.json> [allow-breaking 0|1] [summary.md]',
  );
  process.exit(2);
}
