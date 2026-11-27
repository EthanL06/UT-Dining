// biome-ignore-all lint/suspicious/noExplicitAny: throwaway timing code applied only for a measured build
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useLayoutEffect } from 'react';
import { Alert } from 'react-native';
import { useOnboardingStore } from '~/store/useOnboardingStore';

export const HOST = 'http://127.0.0.1:9199';
const buf: any[] = [];
const waiters = new Map<string, ((v: any) => void)[]>();
export const now = () => performance.now();
const epoch = Date.now() - now();
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const frames = () =>
  new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

export const hooks: any = {};

export const flush = async () => {
  if (!buf.length) return;
  const body = JSON.stringify(buf.splice(0));
  await fetch(`${HOST}/marks`, { method: 'POST', body }).catch(() => {});
};

export const mark = (name: string, data?: any) => {
  buf.push({ name, t: Math.round(epoch + now()), ...data });
  const w = waiters.get(name);
  if (w) {
    waiters.delete(name);
    for (const f of w) f(data ?? {});
  }
};

const signal = (name: string) => {
  const w = waiters.get(name);
  if (!w) return;
  waiters.delete(name);
  for (const f of w) f({});
};

export const painted = (name: string, data?: any) => {
  void frames().then(() => mark(name, data));
};

export const waitFor = (name: string, ms = 30000) =>
  new Promise<any>((res) => {
    const t = setTimeout(() => res('timeout'), ms);
    waiters.set(name, [
      ...(waiters.get(name) ?? []),
      (v) => {
        clearTimeout(t);
        res(v);
      },
    ]);
  });

export const win: any = { on: false };
export const resetWindow = () => {
  Object.assign(win, {
    on: true,
    start: now(),
    events: 0,
    eventTables: {},
    renders: {},
    commits: {},
    durations: {},
    lastCommit: 0,
    fetches: 0,
    maxGap: 0,
    stalls: [],
  });
};
export const closeWindow = () => {
  win.on = false;
  return {
    events: win.events,
    eventTables: win.eventTables,
    renders: win.renders,
    commits: win.commits,
    renderMs: Object.fromEntries(
      Object.entries(win.durations).map(([k, v]: [string, any]) => [
        k,
        Math.round(Math.max(...v) * 10) / 10,
      ]),
    ),
    fetches: win.fetches,
    maxGapMs: Math.round(win.maxGap),
    stallsOver50: win.stalls.length,
    stallMsOver50: Math.round(win.stalls.reduce((a: number, b: number) => a + b, 0)),
    lastCommitMs: win.lastCommit ? Math.round(win.lastCommit - win.start) : null,
  };
};

addDatabaseChangeListener((e: any) => {
  if (!win.on) return;
  win.events += 1;
  win.eventTables[e.tableName] = (win.eventTables[e.tableName] ?? 0) + 1;
});

let last = now();
setInterval(() => {
  const t = now();
  const gap = t - last;
  last = t;
  if (!win.on) return;
  win.maxGap = Math.max(win.maxGap, gap);
  if (gap > 50) win.stalls.push(gap);
}, 16);

export const usePerfRender = (name: string) => {
  const renderStart = now();
  if (win.on) win.renders[name] = (win.renders[name] ?? 0) + 1;
  useLayoutEffect(() => {
    if (win.on) {
      win.commits[name] = (win.commits[name] ?? 0) + 1;
      win.lastCommit = now();
      win.durations[name] = [...(win.durations[name] ?? []), now() - renderStart];
    }
    signal(`commit.${name}`);
  });
};

export const foodRows = (items: any[]) => items.filter((item) => item?.type === 'food_item');

export const usePerfLocation = (status: unknown, items: any[], debouncedQuery: string) => {
  const foods = foodRows(items).length;
  const ready = status === 'ready' || (status === undefined && foods > 0);
  useEffect(() => {
    if (ready && foods > 0) painted('loc.ready', { items: items.length, foods });
  }, [ready, foods, items.length]);
  useEffect(() => {
    if (debouncedQuery) painted('search.ready', { query: debouncedQuery, shown: items.length });
  }, [debouncedQuery, items.length]);
};

export const perfImageUri = (uri: string) => `${HOST}/img/${encodeURIComponent(uri)}`;

mark('js.start');
useOnboardingStore.setState({ isOnboardingComplete: true });
Alert.alert = () => {};

export const syncStarted = () => {
  hooks.syncRunning = true;
  mark('sync.start');
};
export const syncEnded = () => {
  hooks.syncRunning = false;
  hooks.lastSyncEnd = now();
  mark('sync.end');
};

setInterval(() => {
  if (!win.on) void flush();
}, 5000);
