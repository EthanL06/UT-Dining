import { createServer } from 'node:http';
import { buildRestTables } from './e2e-fixtures.ts';

const port = Number(process.argv[2] ?? process.env.FIXTURE_PORT ?? 54331);
const tables = buildRestTables();

type Row = Record<string, unknown>;

const parseList = (value: string) =>
  value
    .replace(/^\(|\)$/g, '')
    .split(',')
    .map((item) => item.trim().replace(/^"|"$/g, ''));

const applyFilter = (rows: Row[], column: string, filter: string): Row[] => {
  const dot = filter.indexOf('.');
  const operator = filter.slice(0, dot);
  const operand = filter.slice(dot + 1);
  switch (operator) {
    case 'eq':
      return rows.filter((row) => String(row[column]) === operand);
    case 'in': {
      const values = new Set(parseList(operand));
      return rows.filter((row) => values.has(String(row[column])));
    }
    default:
      throw new Error(`Unsupported filter ${column}=${filter}`);
  }
};

const applyOrder = (rows: Row[], order: string): Row[] => {
  const [column, direction = 'asc'] = order.split('.');
  const sign = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const left = a[column] as string | number;
    const right = b[column] as string | number;
    if (left === right) return 0;
    return left > right ? sign : -sign;
  });
};

type SelectItem = { name: string; hint?: string; children: SelectItem[] | null };

const parseSelect = (input: string): SelectItem[] => {
  const items: SelectItem[] = [];
  let depth = 0;
  let start = 0;
  const push = (part: string) => {
    const trimmed = part.trim();
    if (!trimmed) return;
    const open = trimmed.indexOf('(');
    if (open === -1) {
      items.push({ name: trimmed, children: null });
      return;
    }
    const head = trimmed.slice(0, open);
    const [name, hint] = (head.includes(':') ? head.split(':')[1] : head).split('!');
    items.push({ name, hint, children: parseSelect(trimmed.slice(open + 1, -1)) });
  };
  for (let i = 0; i < input.length; i += 1) {
    if (input[i] === '(') depth += 1;
    if (input[i] === ')') depth -= 1;
    if (input[i] === ',' && depth === 0) {
      push(input.slice(start, i));
      start = i + 1;
    }
  }
  push(input.slice(start));
  return items;
};

const shape = (table: string, row: Row, select: SelectItem[]): Row => {
  const columns = select.filter((item) => item.children === null).map((item) => item.name);
  const result: Row = columns.includes('*')
    ? { ...row }
    : Object.fromEntries(columns.map((column) => [column, row[column]]));
  for (const item of select) {
    if (item.children === null) continue;
    const related = tables[item.name] ?? [];
    const manyKey = `${table}_id`;
    const oneKey = `${item.name}_id`;
    const parentHoldsKey = item.hint?.startsWith(`${table}_`) ?? false;
    if (!parentHoldsKey && related.length > 0 && manyKey in related[0]) {
      result[item.name] = related
        .filter((child) => child[manyKey] === row.id)
        .map((child) => shape(item.name, child, item.children ?? []));
    } else {
      const match = related.find((child) => child.id === row[oneKey]);
      result[item.name] = match ? shape(item.name, match, item.children ?? []) : null;
    }
  }
  return result;
};

const send = (res: import('node:http').ServerResponse, status: number, body: unknown) => {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
  });
  res.end(json);
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
  const match = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
  console.log(`${req.method} ${url.pathname}${url.search}`);

  if (url.pathname === '/health') return send(res, 200, { ok: true });
  if (!match) return send(res, 404, { message: `No route for ${url.pathname}` });

  const table = match[1];
  if (table === 'user_devices') {
    return req.method === 'GET' ? send(res, 200, []) : send(res, 201, null);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, { message: 'The fixture server is read-only' });
  }

  const source = tables[table];
  if (!source) return send(res, 404, { message: `relation "public.${table}" does not exist` });

  try {
    let rows = source;
    for (const [key, value] of url.searchParams) {
      if (['select', 'order', 'offset', 'limit'].includes(key)) continue;
      rows = applyFilter(rows, key, value);
    }
    const order = url.searchParams.get('order');
    if (order) rows = applyOrder(rows, order);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = url.searchParams.get('limit');
    rows = rows.slice(offset, limit === null ? undefined : offset + Number(limit));
    const select = parseSelect(url.searchParams.get('select') ?? '*');
    return send(
      res,
      200,
      rows.map((row) => shape(table, row, select)),
    );
  } catch (error) {
    return send(res, 400, { message: (error as Error).message });
  }
});

server.listen(port, '127.0.0.1', () => {
  const counts = Object.entries(tables)
    .map(([name, rows]) => `${name}=${rows.length}`)
    .join(' ');
  console.log(`Fixture server on http://127.0.0.1:${port} (${counts})`);
});
