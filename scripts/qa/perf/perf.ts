// biome-ignore-all lint/suspicious/noExplicitAny: throwaway timing code applied only for a measured build
import { focusManager } from '@tanstack/react-query';
import { router } from 'expo-router';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useLayoutEffect } from 'react';
import { Alert } from 'react-native';
import { forceMenuSync } from '~/hooks/useMenuSync';
import { getLocationMenuData, getLocationMenuNames } from '~/services/database/database';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useFiltersStore } from '~/store/useFiltersStore';
import { useOnboardingStore } from '~/store/useOnboardingStore';
import { getTodayInCentralTime } from '~/utils/date';
import { toggleFavoriteForFood } from '~/utils/foodActions';
import { getLocationIdsWithMenus } from '~/utils/locationStatus';

const HOST = 'http://127.0.0.1:9199';
const buf: any[] = [];
const waiters = new Map<string, ((v: any) => void)[]>();
const now = () => performance.now();
const epoch = Date.now() - now();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const frames = () =>
  new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

export const hooks: any = {};

const flush = async () => {
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
  frames().then(() => mark(name, data));
};

const waitFor = (name: string, ms = 30000) =>
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

const win: any = { on: false };
const resetWindow = () => {
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
const closeWindow = () => {
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

const foodRows = (items: any[]) => items.filter((item) => item?.type === 'food_item');

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

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const bench = async (fn: () => unknown, n = 9) => {
  const r: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = now();
    await fn();
    r.push(now() - s);
    await sleep(5);
  }
  return { median: +median(r).toFixed(2), min: +Math.min(...r).toFixed(2) };
};

const settle = async (quiet = 1500) => {
  await sleep(300);
  while (hooks.queryClient.isFetching() > 0) await sleep(50);
  await sleep(quiet);
};

const runSync = async (label: string, trigger: () => void) => {
  resetWindow();
  const s = now();
  const done = waitFor('sync.end', 120000);
  trigger();
  const end = await done;
  const syncMs = end === 'timeout' ? null : Math.round(hooks.lastSyncEnd - s);
  await settle();
  mark('result', { metric: label, syncMs, ...closeWindow() });
};

const foregroundNoChange = () =>
  runSync('foreground-nochange', () => {
    useDataSyncStore.getState().setLastSupabaseQueryTime(0);
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });

const fullRedownload = () =>
  runSync('full-redownload', () => {
    useDataSyncStore.getState().setMenuDayVersions({});
    const qc = hooks.queryClient;
    const force = forceMenuSync as any;
    const run = force.length >= 2 ? force(hooks.db, qc) : force(qc);
    run.catch((e: unknown) => mark('sync.error', { e: String(e) }));
  });

const one = (sql: string, params: any[] = []) => hooks.db.$client.getFirstSync(sql, params);

const pickLocation = () =>
  one(
    `select l.name n, count(*) c from food_item f join menu_category c on c.id=f.menu_category_id join menu m on m.id=c.menu_id join location l on l.id=m.location_id where m.date=? group by l.name order by c desc limit 1`,
    [getTodayInCentralTime()],
  );

const act = async (name: string, fn: () => unknown, extraMs = 0) => {
  await sleep(600);
  resetWindow();
  const committed = waitFor('commit.location', 5000);
  const s = now();
  fn();
  const c = await committed;
  await frames();
  const ms = Math.round(now() - s - extraMs);
  await sleep(500);
  const w = closeWindow();
  return {
    action: name,
    ms: c === 'timeout' ? null : ms,
    foodRowRenders: w.renders.FoodItemRow ?? 0,
    foodComponentRenders: w.renders.FoodComponent ?? 0,
    headerRenders: w.renders.CategoryHeader ?? 0,
    locationRenders: w.renders.location ?? 0,
    maxGapMs: w.maxGapMs,
  };
};

const menuActions = async (word: string) => {
  const loc = hooks.loc;
  const items: any[] = loc.items;
  const header = items.find((item) => item.type === 'category_header');
  const food = foodRows(items)[0];
  const out: any[] = [];
  out.push(await act('collapse category', () => hooks.loc.toggleCategory(header.id)));
  out.push(await act('expand category', () => hooks.loc.toggleCategory(header.id)));
  const ctx = { location: loc.location, menu: loc.selectedMenu ?? '', category: food.categoryId };
  out.push(await act('favorite item', () => toggleFavoriteForFood(loc.db, food.data, ctx)));
  await sleep(300);
  await toggleFavoriteForFood(hooks.loc.db, food.data, ctx);
  await sleep(300);
  const q = word.slice(0, 3);
  const searched = waitFor('search.ready', 5000);
  await sleep(600);
  resetWindow();
  const s = now();
  hooks.loc.setSearchQuery(q);
  const sr = await searched;
  const searchMs = Math.round(now() - s);
  await sleep(500);
  const sw = closeWindow();
  out.push({
    action: 'search 3 letters',
    ms: sr === 'timeout' ? null : searchMs - 300,
    foodRowRenders: sw.renders.FoodItemRow ?? 0,
    foodComponentRenders: sw.renders.FoodComponent ?? 0,
    headerRenders: sw.renders.CategoryHeader ?? 0,
    locationRenders: sw.renders.location ?? 0,
    maxGapMs: sw.maxGapMs,
  });
  hooks.loc.setSearchQuery('');
  await sleep(800);
  const filters = useFiltersStore.getState();
  out.push(await act('toggle Vegetarian filter', () => filters.toggleDietaryFilter('Vegetarian')));
  filters.toggleDietaryFilter('Vegetarian');
  await sleep(500);
  const first = foodRows(hooks.loc.items)[0];
  out.push(await act('enter multi-select', () => hooks.loc.startSelecting(first.id)));
  out.push(await act('leave multi-select', () => hooks.loc.stopSelecting()));
  return out;
};

const openLocation = async () => {
  const { db, queryClient } = hooks;
  const today = getTodayInCentralTime();
  const loc = pickLocation();
  if (!loc) {
    mark('result', { metric: 'location', error: 'no menu today' });
    return;
  }
  queryClient.removeQueries({
    predicate: (q: any) => q.queryKey[0] === 'menuNames' || q.queryKey.length > 1,
  });
  resetWindow();
  const ready = waitFor('loc.ready');
  const s = now();
  router.push({ pathname: '/location/[location]', params: { location: loc.n } } as any);
  const r = await ready;
  const openMs = Math.round(now() - s);
  await sleep(1200);
  const w1 = closeWindow();
  const menuName = (await getLocationMenuNames(db, loc.n, today))[0] as string;
  const word = (
    one(
      `select f.name n from food_item f join menu_category c on c.id=f.menu_category_id join menu m on m.id=c.menu_id join location l on l.id=m.location_id where l.name=? and m.date=? and m.name=? order by f.id limit 1`,
      [loc.n, today, menuName],
    )?.n ?? 'chicken'
  )
    .split(' ')[0]
    .toLowerCase();
  const actions = await menuActions(word);
  const menuData = await bench(() => getLocationMenuData(db, loc.n, menuName, today));
  const menuNames = await bench(() => getLocationMenuNames(db, loc.n, today));
  const idsWithMenus = await bench(() => getLocationIdsWithMenus(db, today));
  const searchSql = hooks.searchToday
    ? await bench(() => hooks.searchToday(db, word.slice(0, 4)))
    : { median: null };
  mark('result', {
    metric: 'location',
    loc: loc.n,
    foodsToday: loc.c,
    items: r?.items,
    openMs: r === 'timeout' ? null : openMs,
    word,
    actions,
    getLocationMenuData: menuData,
    getLocationMenuNames: menuNames,
    getLocationIdsWithMenus: idsWithMenus,
    searchTodaySql: searchSql,
    openRenders: w1.renders,
    openMaxGapMs: w1.maxGapMs,
  });
  router.back();
  await sleep(800);
};

const openPlaceOnce = async (name: string) => {
  const loaded = Promise.race([
    waitFor('image.loaded', 10000).then((v) => (v === 'timeout' ? 'timeout' : 'loaded')),
    waitFor('image.error', 10000).then((v) => (v === 'timeout' ? 'timeout' : 'error')),
  ]);
  const s = now();
  router.push({ pathname: '/location_generic/[location]', params: { location: name } } as any);
  const outcome = await loaded;
  const ms = Math.round(now() - s);
  await sleep(800);
  router.back();
  await sleep(1200);
  return { outcome, ms: outcome === 'loaded' ? ms : null };
};

const openPlace = async () => {
  const place = one(
    `select name n, image i from location where image is not null and image != '' and has_menus = 0 order by display_order, name limit 1`,
  );
  if (!place) {
    mark('result', { metric: 'place', error: 'no place with an image' });
    return;
  }
  const open = await openPlaceOnce(place.n);
  const reopen = await openPlaceOnce(place.n);
  mark('result', { metric: 'place', place: place.n, image: place.i, open, reopen });
};

const homeActions = async () => {
  const out: any[] = [];
  const timed = async (action: string, component: string, fn: () => void, waitMs = 600) => {
    await sleep(600);
    resetWindow();
    const committed = waitFor(`commit.${component}`, 5000);
    const s = now();
    fn();
    const c = await committed;
    await frames();
    const ms = Math.round(now() - s);
    await sleep(waitMs);
    const w = closeWindow();
    out.push({
      action,
      ms: c === 'timeout' ? null : ms,
      renderMs: w.renderMs[component] ?? null,
      commits: w.commits[component] ?? 0,
      maxGapMs: w.maxGapMs,
    });
  };
  for (let i = 0; i < 5; i++) {
    await timed('home 60 s tick', 'home', () => {
      for (const refresh of hooks.nowRefreshers ?? []) refresh();
    });
  }
  const types: string[] = (hooks.home.types ?? []).map((t: any) => t.name);
  for (let i = 0; i < 5; i++) {
    const target = i % 2 === 0 ? (types[i % Math.max(types.length, 1)] ?? 'all') : 'all';
    await timed('home type chip', 'home', () => hooks.home.setSelectedFilter(target));
  }
  hooks.home.setSelectedFilter('all');
  router.navigate('/search' as any);
  await sleep(1500);
  const words = ['chi', 'ric', 'sal', 'bur', 'egg'];
  for (const word of words) {
    await timed('search tab 3 letters', 'search', () => hooks.setSearchTabQuery(word), 800);
    hooks.setSearchTabQuery('');
    await sleep(400);
  }
  router.navigate('/' as any);
  await sleep(800);
  mark('result', { metric: 'home', actions: out });
};

const counts = () => {
  const raw = hooks.db.$client;
  const c = (q: string) => raw.getFirstSync(q).c;
  return {
    location: c('select count(*) c from location'),
    menu: c('select count(*) c from menu'),
    food: c('select count(*) c from food_item'),
    perDay: raw.getAllSync(
      'select m.date d, count(f.id) foods from menu m join menu_category c on c.menu_id=m.id join food_item f on f.menu_category_id=c.id group by m.date order by m.date',
    ),
    indexes: raw
      .getAllSync(`select name from sqlite_master where type='index' and name not like 'sqlite_%'`)
      .map((x: any) => x.name),
    hermesProfiler: typeof (globalThis as any).HermesInternal?.enableSamplingProfiler,
  };
};

let ran = false;
export const runHarness = async (db: any, queryClient: any) => {
  if (ran) return;
  ran = true;
  hooks.db = db;
  hooks.queryClient = queryClient;
  queryClient.getQueryCache().subscribe((e: any) => {
    if (win.on && e.type === 'updated' && e.action?.type === 'fetch') win.fetches += 1;
  });
  let control: any = {};
  try {
    control = await (await fetch(`${HOST}/control`)).json();
  } catch {}
  await sleep(control.mode === 'prime' ? 500 : 2500);
  if (hooks.syncRunning) await waitFor('sync.end', 120000);
  await settle();
  mark('counts', { ...counts(), lastSync: useDataSyncStore.getState().lastSupabaseQueryTime });
  if (control.mode === 'foreground') await foregroundNoChange();
  if (control.mode === 'full') await fullRedownload();
  if (control.mode === 'location') {
    router.navigate('/search' as any);
    await sleep(1500);
    await openLocation();
  }
  if (control.mode === 'place') await openPlace();
  if (control.mode === 'home') await homeActions();
  mark('cycle.done');
  await flush();
};

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
  if (!win.on) flush();
}, 5000);
