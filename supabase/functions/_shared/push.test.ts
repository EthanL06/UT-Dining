import { assertEquals } from 'jsr:@std/assert@1';
import { broadcast, type DeviceStore, fetchPushTokens, sendPush } from './push.ts';

const memoryStore = (tokens: (string | null)[]) => {
  const rows = tokens.map((push_token) => ({ push_token }));
  const removed: string[][] = [];
  const pages: [number, number][] = [];
  const store: DeviceStore = {
    page: (from, to) => {
      pages.push([from, to]);
      return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
    },
    removeTokens: (list) => {
      removed.push(list);
      return Promise.resolve({ error: null });
    },
  };
  return { store, removed, pages };
};

const expoFetch =
  (ticketFor: (token: string) => Record<string, unknown>, calls: unknown[] = []): typeof fetch =>
  (_url, init) => {
    const body = JSON.parse(String(init?.body));
    calls.push(body);
    return Promise.resolve(
      new Response(JSON.stringify({ data: body.to.map(ticketFor) }), { status: 200 }),
    );
  };

const content = { title: 'Hi', body: 'There', data: { redirect_url: '/x' } };

Deno.test('fetchPushTokens pages past 1,000 devices and drops empty and duplicate tokens', async () => {
  const tokens = Array.from({ length: 2500 }, (_, i) => `t${i}`);
  const { store, pages } = memoryStore([...tokens, null, 't1']);
  const result = await fetchPushTokens(store);
  assertEquals(result.length, 2500);
  assertEquals(pages, [
    [0, 999],
    [1000, 1999],
    [2000, 2999],
  ]);
});

Deno.test('sendPush batches 100 tokens per request and sends redirect_url', async () => {
  const calls: { to: string[]; data: Record<string, unknown> }[] = [];
  const tokens = Array.from({ length: 250 }, (_, i) => `t${i}`);
  const { report } = await sendPush(tokens, content, {
    fetchImpl: expoFetch(() => ({ status: 'ok' }), calls),
  });
  assertEquals(
    calls.map((call) => call.to.length),
    [100, 100, 50],
  );
  assertEquals(calls[0].data.redirect_url, '/x');
  assertEquals(report.accepted, 250);
});

Deno.test('broadcast removes tokens Expo reports as DeviceNotRegistered', async () => {
  const { store, removed } = memoryStore(['good', 'dead', 'bad']);
  const report = await broadcast(store, content, {
    fetchImpl: expoFetch((token) => {
      if (token === 'dead') {
        return { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } };
      }
      if (token === 'bad') return { status: 'error', message: 'MessageTooBig' };
      return { status: 'ok' };
    }),
  });
  assertEquals(report.accepted, 1);
  assertEquals(report.rejected, 2);
  assertEquals(report.removedTokens, 1);
  assertEquals(removed, [['dead']]);
  assertEquals(report.errors, ['MessageTooBig']);
});

Deno.test('a failed Expo request counts as a failed batch instead of success', async () => {
  const { store } = memoryStore(['a']);
  const report = await broadcast(store, content, {
    fetchImpl: () => Promise.resolve(new Response('nope', { status: 503 })),
  });
  assertEquals(report.accepted, 0);
  assertEquals(report.failedBatches, 1);
});
