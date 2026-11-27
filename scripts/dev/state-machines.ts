import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const SOURCE = /\.(ts|tsx)$/;
const SKIPPED = [
  /^packages\/supabase\/src\/database\.types\.ts$/,
  /^apps\/mobile\/drizzle\//,
  /(^|\/)node_modules\//,
  /\.d\.ts$/,
  /\.test\.tsx?$/,
  /^scripts\//,
];
const STATUS_NAME = /(status|state|phase|mode|step|stage|view)$/i;
const OPT_OUT = /^\/\/\s*state-machine-ok:\s*\S/;

interface Finding {
  file: string;
  line: number;
  message: string;
}

interface StateHook {
  node: ts.CallExpression;
  name: string;
  statement: ts.Node;
}

const isUseState = (node: ts.Node): node is ts.CallExpression => {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (ts.isIdentifier(callee)) return callee.text === 'useState';
  return ts.isPropertyAccessExpression(callee) && callee.name.text === 'useState';
};

const isFunctionLike = (node: ts.Node) =>
  ts.isFunctionDeclaration(node) ||
  ts.isFunctionExpression(node) ||
  ts.isArrowFunction(node) ||
  ts.isMethodDeclaration(node);

const unwrapInitializer = (node: ts.Expression | undefined): ts.Expression | undefined => {
  if (!node) return undefined;
  if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) return node.body;
  return node;
};

const isBooleanState = (call: ts.CallExpression) => {
  const typeArg = call.typeArguments?.[0];
  if (typeArg) return typeArg.kind === ts.SyntaxKind.BooleanKeyword;
  const init = unwrapInitializer(call.arguments[0]);
  return (
    init !== undefined &&
    (init.kind === ts.SyntaxKind.TrueKeyword || init.kind === ts.SyntaxKind.FalseKeyword)
  );
};

const isUntypedStatus = (call: ts.CallExpression, name: string) => {
  if (!STATUS_NAME.test(name)) return false;
  const typeArg = call.typeArguments?.[0];
  if (typeArg) return typeArg.kind === ts.SyntaxKind.StringKeyword;
  const init = unwrapInitializer(call.arguments[0]);
  return (
    init !== undefined && (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init))
  );
};

const stateName = (call: ts.CallExpression) => {
  const parent = call.parent;
  if (ts.isVariableDeclaration(parent)) {
    if (ts.isArrayBindingPattern(parent.name)) {
      const first = parent.name.elements[0];
      if (first && ts.isBindingElement(first) && ts.isIdentifier(first.name))
        return first.name.text;
    }
    if (ts.isIdentifier(parent.name)) return parent.name.text;
  }
  return '';
};

const enclosingStatement = (node: ts.Node) => {
  let current: ts.Node = node;
  while (current.parent && !ts.isBlock(current.parent) && !ts.isSourceFile(current.parent)) {
    current = current.parent;
  }
  return current;
};

const optedOut = (text: string, statement: ts.Node) =>
  (ts.getLeadingCommentRanges(text, statement.pos) ?? []).some((range) =>
    OPT_OUT.test(text.slice(range.pos, range.end)),
  );

const collectHooks = (fn: ts.Node, source: ts.SourceFile): StateHook[] => {
  const hooks: StateHook[] = [];
  const visit = (node: ts.Node) => {
    if (node !== fn && isFunctionLike(node)) return;
    if (isUseState(node)) {
      hooks.push({ node, name: stateName(node), statement: enclosingStatement(node) });
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(fn, visit);
  return hooks.filter((hook) => hook.node.getSourceFile() === source);
};

const checkFile = (file: string): Finding[] => {
  const text = readFileSync(file, 'utf8');
  if (!text.includes('useState')) return [];
  const kind = file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const findings: Finding[] = [];
  const lineOf = (node: ts.Node) =>
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

  const visit = (node: ts.Node) => {
    if (isFunctionLike(node)) {
      const hooks = collectHooks(node, source).filter((hook) => !optedOut(text, hook.statement));
      const booleans = hooks.filter((hook) => isBooleanState(hook.node));
      if (booleans.length >= 2) {
        const names = booleans.map((hook) => hook.name || 'unnamed').join(', ');
        for (const hook of booleans) {
          findings.push({
            file,
            line: lineOf(hook.node),
            message: `${booleans.length} boolean useState in one function (${names}). Model them as one discriminated union or string-literal status.`,
          });
        }
      }
      for (const hook of hooks) {
        if (isUntypedStatus(hook.node, hook.name)) {
          findings.push({
            file,
            line: lineOf(hook.node),
            message: `useState for "${hook.name}" is typed as plain string. Give it a string-literal union type or a discriminated union.`,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return findings;
};

const explicit = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const files = (
  explicit.length > 0
    ? explicit
    : execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
        encoding: 'utf8',
      })
        .split('\n')
        .filter(Boolean)
).filter((file) => SOURCE.test(file) && !SKIPPED.some((pattern) => pattern.test(file)));

const findings = files.flatMap(checkFile);

for (const finding of findings) {
  process.stdout.write(`${finding.file}:${finding.line}  ${finding.message}\n`);
}
process.exit(findings.length > 0 ? 1 : 0);
