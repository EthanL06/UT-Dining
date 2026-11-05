// biome-ignore-all lint/suspicious/noExplicitAny: throwaway timing code applied only for a measured build
import { router } from 'expo-router';
import { Alert } from 'react-native';
import {
  getFoodItem,
  getLocationMenuData,
  getLocationMenuNames,
} from '~/services/database/database';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useOnboardingStore } from '~/store/useOnboardingStore';

const HOST = 'http://127.0.0.1:9199';
const buf: any[] = [];
let timer: any = null;
const waiters = new Map<string, ((v: any) => void)[]>();

const flush = () => {
  timer = null;
  if (!buf.length) return;
  const body = JSON.stringify(buf.splice(0));
  fetch(`${HOST}/marks`, { method: 'POST', body }).catch(() => {});
};

let syncStarted = false;
let syncEnded = false;

export const mark = (name: string, data?: any) => {
  if (name === 'sync.start') syncStarted = true;
  if (name === 'read.stress') syncEnded = true;
  buf.push({ name, t: Date.now(), ...data });
  if (!timer) timer = setTimeout(flush, 1000);
  const w = waiters.get(name);
  if (w) {
    waiters.delete(name);
    for (const f of w) f(data);
  }
};

export const painted = (name: string, data?: any) => {
  requestAnimationFrame(() => requestAnimationFrame(() => mark(name, data)));
};

const waitFor = (name: string, ms = 8000) =>
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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const hooks: any = {};
export const accum: Record<string, { n: number; ms: number; max: number }> = {};
export const timeIt = <T>(name: string, fn: () => T): T => {
  const s = performance.now();
  const r = fn();
  const d = performance.now() - s;
  accum[name] ??= { n: 0, ms: 0, max: 0 };
  const a = accum[name];
  a.n += 1;
  a.ms += d;
  a.max = Math.max(a.max, d);
  return r;
};

mark('js.start', { startup: (performance as any).rnStartupTiming ?? null });
useOnboardingStore.setState({ isOnboardingComplete: true });
Alert.alert = () => {};

let last = performance.now();
const startedAt = last;
setInterval(() => {
  const now = performance.now();
  const gap = now - last;
  if (gap > 50) mark('stall', { ms: Math.round(gap), at: Math.round(last - startedAt) });
  last = now;
}, 16);

export const startReadStress = (db: any) => {
  const raw = db.$client;
  const r = {
    writes: 0,
    writeErrors: 0,
    reads: 0,
    errors: 0,
    sample: '',
    min: Infinity as number,
    max: 0,
    slowest: 0,
  };
  const id = setInterval(() => {
    const s = performance.now();
    try {
      const c = raw.getFirstSync('select count(*) c from food_item').c;
      r.reads += 1;
      r.min = Math.min(r.min, c);
      r.max = Math.max(r.max, c);
    } catch (e) {
      r.errors += 1;
      r.sample ||= String(e);
    }
    r.slowest = Math.max(r.slowest, performance.now() - s);
  }, 20);
  return () => {
    clearInterval(id);
    mark('read.stress', { ...r, slowest: Math.round(r.slowest) });
  };
};

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const benchQuery = async (name: string, fn: () => any, n = 7) => {
  const r: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = performance.now();
    await fn();
    r.push(performance.now() - s);
    await sleep(5);
  }
  return { name, median: +median(r).toFixed(2), max: +Math.max(...r).toFixed(2) };
};

const sqlBench = async (db: any) => {
  const raw = db.$client;
  const loc =
    raw.getFirstSync(
      `select l.name n from location l join menu m on m.location_id=l.id where l.name='J2 Dining' limit 1`,
    )?.n ??
    raw.getFirstSync(`select l.name n from location l join menu m on m.location_id=l.id limit 1`).n;
  const date = hooks.today();
  const names = await getLocationMenuNames(db, loc, date);
  const menuName = names[0] as string;
  const food = raw.getFirstSync(
    `select c.title t, f.name n from food_item f join menu_category c on c.id=f.menu_category_id join menu m on m.id=c.menu_id join location l on l.id=m.location_id where l.name=? and m.name=? and m.date=? limit 1`,
    [loc, menuName, date],
  );
  const run = async (label: string) => {
    const out = [
      await benchQuery('getLocationMenuNames', () => getLocationMenuNames(db, loc, date)),
      await benchQuery('getLocationMenuData', () => getLocationMenuData(db, loc, menuName, date)),
      await benchQuery('getFoodItem', () => getFoodItem(db, loc, menuName, food.t, food.n, date)),
      await benchQuery('openStatus(menu by loc+date)', () =>
        raw.getFirstSync(
          `select * from menu where location_id=(select id from location where name=?) and date=?`,
          [loc, date],
        ),
      ),
    ];
    mark('sql.bench', { label, out });
  };
  await run('no indexes');
  raw.execSync(
    `create index if not exists p1 on menu(location_id,date); create index if not exists p2 on menu_category(menu_id); create index if not exists p3 on food_item(menu_category_id); create index if not exists p4 on location(name);`,
  );
  await run('with indexes');
  raw.execSync('drop index p1; drop index p2; drop index p3; drop index p4;');
  const plan = raw.getAllSync(
    `explain query plan select * from location l left join menu m on m.location_id=l.id left join menu_category c on c.menu_id=m.id left join food_item f on f.menu_category_id=c.id left join allergens a on a.id=f.allergens_id left join nutrition n on n.id=f.nutrition_id where l.name='x' and m.name='y' and m.date='z'`,
  );
  mark('sql.plan', { plan: plan.map((p: any) => p.detail) });
};

const writeBench = async (db: any, schema: any) => {
  const raw = db.$client;
  const tables = ['menu', 'menu_category', 'food_item', 'nutrition', 'allergens'];
  const rows: Record<string, any[]> = {};
  for (const t of tables) rows[t] = raw.getAllSync(`select * from ${t}`);
  const counts = Object.fromEntries(tables.map((t) => [t, rows[t].length]));
  const sqlFor = (t: string, chunk: any[]) => {
    const cols = Object.keys(chunk[0]);
    const one = `(${cols.map(() => '?').join(',')})`;
    return {
      q: `insert into ${t} (${cols.join(',')}) values ${chunk.map(() => one).join(',')}`,
      v: chunk.flatMap((r) => cols.map((c) => r[c])),
    };
  };
  const chunks = (a: any[], n: number) => {
    const o = [];
    for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
    return o;
  };
  const sizes: any = {
    menu: 150,
    menu_category: 200,
    food_item: 150,
    nutrition: 40,
    allergens: 40,
  };

  const report = (label: string, ms: number, maxStall: number) =>
    mark('write.bench', { label, ms: Math.round(ms), maxStall: Math.round(maxStall), counts });

  const measure = async (label: string, fn: () => Promise<void> | void) => {
    await sleep(200);
    let maxStall = 0;
    let prev = performance.now();
    const hb = setInterval(() => {
      const n = performance.now();
      maxStall = Math.max(maxStall, n - prev);
      prev = n;
    }, 8);
    const s = performance.now();
    await fn();
    const ms = performance.now() - s;
    await sleep(30);
    clearInterval(hb);
    report(label, ms, maxStall);
  };

  const dtables: any = {
    menu: schema.menu,
    menu_category: schema.menu_category,
    food_item: schema.food_item,
    nutrition: schema.nutrition,
    allergens: schema.allergens,
  };
  const del = () => tables.forEach((t) => raw.runSync(`delete from ${t}`));
  await measure('current: drizzle, no transaction', async () => {
    await Promise.all(tables.map((t) => db.delete(dtables[t]).execute()));
    await Promise.all(
      tables.flatMap((t) => chunks(rows[t], sizes[t]).map((c) => db.insert(dtables[t]).values(c))),
    );
  });
  await measure('one sync transaction', () => {
    raw.withTransactionSync(() => {
      del();
      for (const t of tables)
        for (const c of chunks(rows[t], sizes[t])) {
          const { q, v } = sqlFor(t, c);
          raw.runSync(q, v);
        }
    });
  });
  await measure('one async exclusive transaction', async () => {
    await raw.withExclusiveTransactionAsync(async (tx: any) => {
      for (const t of tables) await tx.runAsync(`delete from ${t}`);
      for (const t of tables)
        for (const c of chunks(rows[t], sizes[t])) {
          const { q, v } = sqlFor(t, c);
          await tx.runAsync(q, v);
        }
    });
  });
  const dbBytes = raw.getFirstSync(
    'select page_count*page_size b from pragma_page_count(), pragma_page_size()',
  );
  mark('db.size', dbBytes);
};

const navBench = async () => {
  const { locations } = hooks;
  const qc = hooks.queryClient;
  for (const loc of locations) {
    for (let i = 0; i < 6; i++) {
      const cold = i % 2 === 0;
      if (cold)
        qc.removeQueries({
          predicate: (q: any) => !(q.queryKey[0] === 'menuData' && q.queryKey.length === 1),
        });
      const label = cold ? 'cold' : 'cached';
      let w = waitFor('loc.ready');
      mark('nav.loc.start', { loc, label });
      router.push(`/location/${loc}` as any);
      await w;
      mark('nav.loc.end', { loc, label });
      await sleep(700);
      const f = hooks.filters ?? [];
      if (f.length > 1) {
        const original = hooks.selectedMenu;
        const target = f.find((x: any) => x.id !== original).id;
        w = waitFor('menu.ready');
        const d = waitFor('menu.data');
        mark('nav.menu.start', { loc, label });
        hooks.setSelectedMenu(target);
        await d;
        mark('nav.menu.dataend', { loc, label });
        await w;
        mark('nav.menu.end', { loc, label });
        await sleep(300);
        hooks.setSelectedMenu(original);
        await sleep(600);
      }
      w = waitFor('loc.ready');
      mark('nav.date.start', { loc, label });
      hooks.setDate(hooks.tomorrow());
      await w;
      mark('nav.date.end', { loc, label });
      await sleep(300);
      hooks.setDate(hooks.today());
      await sleep(400);
      const fp = hooks.firstFood?.();
      if (fp) {
        w = waitFor('food.ready');
        mark('nav.food.start', { loc, label });
        router.push({ pathname: '/food/[food]', params: fp } as any);
        await w;
        mark('nav.food.end', { loc, label });
        await sleep(600);
        router.back();
        await sleep(600);
      }
      router.back();
      await sleep(800);
    }
  }
  for (const tab of ['map', 'notifications', 'settings', 'index']) {
    const w = waitFor(`tab.${tab}`, 3000);
    mark('nav.tab.start', { tab });
    router.navigate(`/(tabs)/${tab === 'index' ? '' : tab}` as any);
    await w;
    mark('nav.tab.end', { tab });
    await sleep(600);
  }
};

let ran = false;
export const runHarness = async (db: any, schema: any) => {
  if (ran) return;
  ran = true;
  await sleep(1500);
  if (syncStarted && !syncEnded) await waitFor('read.stress', 60000);
  const raw = db.$client;
  mark('counts', {
    location: raw.getFirstSync('select count(*) c from location').c,
    menu: raw.getFirstSync('select count(*) c from menu').c,
    food: raw.getFirstSync('select count(*) c from food_item').c,
    lastSync: useDataSyncStore.getState().lastSupabaseQueryTime,
    journal: raw.getFirstSync('pragma journal_mode').journal_mode,
    accum,
  });
  let control: any = {};
  try {
    control = await (await fetch(`${HOST}/control`)).json();
  } catch {}
  if (control.nav) await navBench();
  if (control.sql) await sqlBench(db);
  if (control.write) await writeBench(db, schema);
  if (control.setStale) useDataSyncStore.getState().setLastSupabaseQueryTime(0);
  if (control.dropToday) {
    const store = useDataSyncStore.getState();
    const { [hooks.today()]: _, ...rest } = store.menuDayVersions;
    store.setMenuDayVersions(rest);
  }
  mark('cycle.done');
  flush();
};
