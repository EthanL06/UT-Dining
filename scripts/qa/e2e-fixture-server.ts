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
    return send(res, 200, rows);
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
