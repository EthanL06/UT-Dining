import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

type Size = { raw: number; gzip: number };

type MobileReport = {
  bytecode: Size;
  js: Size;
  assets: { bytes: number; count: number };
  groups: Record<string, number>;
};

type PageReport = { route: string; js: number; css: number; html: number };

type LighthouseReport = {
  url: string;
  runs: number;
  scores: Record<string, number>;
  metrics: Record<string, number>;
};

type WebsiteReport = {
  js: Size;
  css: Size;
  output: { bytes: number; count: number };
  pages: PageReport[];
  lighthouse: LighthouseReport[];
};

type Side<T> = { sha: string; report: T };
type Comparison<T> = { base: Side<T> | null; head: Side<T> };

type Budgets = {
  enforce: boolean;
  mobile: { maxBytecodeGrowthKb: number; maxBytecodeGrowthPercent: number };
  website: { maxPageJsGzipKb: number; maxJsGrowthPercent: number };
  lighthouse: { minScores: Record<string, number>; maxScoreDrop: number };
};

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const CATEGORY_LABELS: Record<string, string> = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  'best-practices': 'Best practices',
  seo: 'SEO',
};
const METRICS = [
  'first-contentful-paint',
  'largest-contentful-paint',
  'total-blocking-time',
  'cumulative-layout-shift',
];
const MARKER = '<!-- pr-size-report -->';

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const sizeOf = (path: string): Size => {
  const data = readFileSync(path);
  return { raw: data.length, gzip: gzipSync(data, { level: 9 }).length };
};

const addSize = (a: Size, b: Size): Size => ({ raw: a.raw + b.raw, gzip: a.gzip + b.gzip });

const findOne = (dir: string, suffix: string): string => {
  const match = walk(dir).find((path) => path.endsWith(suffix));
  if (!match) throw new Error(`No *${suffix} file in ${dir}`);
  return match;
};

const groupFor = (source: string): string => {
  const normalized = source.replaceAll('\\', '/');
  const marker = '/node_modules/';
  const index = normalized.lastIndexOf(marker);
  if (index !== -1) {
    const parts = normalized.slice(index + marker.length).split('/');
    return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
  }
  const parts = normalized.replace(/^\/+/, '').split('/');
  if (parts[0] === 'packages') return `@ut-dining/${parts[1]}`;
  if (parts[0] === 'apps' && parts.length > 3) return `${parts[1]}/${parts[2]}`;
  if (parts[0] === 'apps') return parts[1];
  return parts[0] || 'other';
};

type SectionMap = { sections?: { offset: { line: number }; map: { sources: string[] } }[] };

const groupBundle = (jsPath: string, mapPath: string): Record<string, number> => {
  const lines = readFileSync(jsPath, 'utf8').split('\n');
  const lineBytes = lines.map((line) => Buffer.byteLength(line) + 1);
  const map = JSON.parse(readFileSync(mapPath, 'utf8')) as SectionMap;
  const sections = map.sections ?? [];
  const groups: Record<string, number> = {};
  sections.forEach((section, i) => {
    const start = section.offset.line;
    const end = sections[i + 1]?.offset.line ?? lines.length;
    let bytes = 0;
    for (let line = start; line < end; line++) bytes += lineBytes[line] ?? 0;
    const group = groupFor(section.map.sources[0] ?? 'other');
    groups[group] = (groups[group] ?? 0) + bytes;
  });
  return groups;
};

const mobile = (bytecodeDir: string, jsDir: string): MobileReport => {
  const assetsDir = join(bytecodeDir, 'assets');
  const assets = existsSync(assetsDir) ? walk(assetsDir) : [];
  const jsPath = findOne(jsDir, '.js');
  return {
    bytecode: sizeOf(findOne(bytecodeDir, '.hbc')),
    js: sizeOf(jsPath),
    assets: {
      bytes: assets.reduce((sum, path) => sum + statSync(path).size, 0),
      count: assets.length,
    },
    groups: groupBundle(jsPath, findOne(jsDir, '.js.map')),
  };
};

const routeFor = (outDir: string, htmlPath: string): string => {
  const rel = relative(outDir, htmlPath).split(sep).join('/');
  if (rel === 'index.html') return '/';
  return `/${rel.replace(/\/?index\.html$/, '').replace(/\.html$/, '')}/`.replace('//', '/');
};

const assetPaths = (html: string, pattern: RegExp): string[] =>
  [...new Set([...html.matchAll(pattern)].map((match) => match[1]))].filter(
    (src) => !/^https?:/.test(src),
  );

const lighthouse = (dir: string): LighthouseReport[] => {
  if (!existsSync(dir)) return [];
  const byUrl = new Map<
    string,
    { scores: Record<string, number>; metrics: Record<string, number> }[]
  >();
  for (const file of readdirSync(dir).filter((name) => /^lhr-.*\.json$/.test(name))) {
    const lhr = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    if (lhr.runtimeError) continue;
    const url = new URL(lhr.requestedUrl).pathname;
    const scores = Object.fromEntries(
      CATEGORIES.map((key) => [key, Math.round((lhr.categories[key]?.score ?? 0) * 100)]),
    );
    const metrics = Object.fromEntries(
      METRICS.map((key) => [key, lhr.audits[key]?.numericValue ?? 0]),
    );
    byUrl.set(url, [...(byUrl.get(url) ?? []), { scores, metrics }]);
  }
  return [...byUrl.entries()]
    .map(([url, runs]) => {
      const sorted = [...runs].sort((a, b) => a.scores.performance - b.scores.performance);
      const median = sorted[Math.floor(sorted.length / 2)];
      return { url, runs: runs.length, ...median };
    })
    .sort((a, b) => a.url.localeCompare(b.url));
};

const website = (outDir: string, lighthouseDir: string): WebsiteReport => {
  const files = walk(outDir);
  const sum = (paths: string[]) =>
    paths.reduce<Size>((total, path) => addSize(total, sizeOf(path)), { raw: 0, gzip: 0 });
  const gzipCache = new Map<string, number>();
  const gzipOf = (src: string) => {
    const path = join(outDir, src.split('?')[0]);
    if (!existsSync(path)) return 0;
    if (!gzipCache.has(path)) gzipCache.set(path, sizeOf(path).gzip);
    return gzipCache.get(path) ?? 0;
  };
  const pages = files
    .filter((path) => path.endsWith('.html'))
    .map((path) => {
      const html = readFileSync(path, 'utf8');
      const scripts = assetPaths(html, /<script[^>]*\ssrc="([^"]+)"/g);
      const styles = assetPaths(html, /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g);
      return {
        route: routeFor(outDir, path),
        js: scripts.reduce((total, src) => total + gzipOf(src), 0),
        css: styles.reduce((total, src) => total + gzipOf(src), 0),
        html: sizeOf(path).gzip,
      };
    })
    .filter((page) => !/^\/(404|_not-found)\/$/.test(page.route))
    .sort((a, b) => a.route.localeCompare(b.route));
  return {
    js: sum(files.filter((path) => path.endsWith('.js'))),
    css: sum(files.filter((path) => path.endsWith('.css'))),
    output: {
      bytes: files.reduce((total, path) => total + statSync(path).size, 0),
      count: files.length,
    },
    pages,
    lighthouse: lighthouse(lighthouseDir),
  };
};

const formatBytes = (bytes: number): string => {
  const abs = Math.abs(bytes);
  if (abs >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (abs >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const formatDelta = (base: number | undefined, head: number): string => {
  if (base === undefined) return 'new';
  const delta = head - base;
  if (delta === 0) return 'no change';
  const percent =
    base === 0 ? '' : ` (${delta > 0 ? '+' : ''}${((delta / base) * 100).toFixed(1)}%)`;
  return `${delta > 0 ? '+' : '-'}${formatBytes(Math.abs(delta))}${percent}`;
};

const formatScoreDelta = (base: number | undefined, head: number): string => {
  if (base === undefined || base === head) return `${head}`;
  return `${head} (${head > base ? '+' : ''}${head - base})`;
};

const formatMs = (value: number): string =>
  value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;

const sizeRow = (label: string, base: number | undefined, head: number): string =>
  `| ${label} | ${base === undefined ? '-' : formatBytes(base)} | ${formatBytes(head)} | ${base === undefined ? '-' : formatDelta(base, head)} |`;

const short = (sha: string) => `\`${sha.slice(0, 7)}\``;

const readJson = <T>(path: string | undefined): T | null =>
  path && existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : null;

const renderMobile = (
  data: Comparison<MobileReport>,
  warnings: string[],
  budgets: Budgets,
): string[] => {
  const base = data.base?.report;
  const head = data.head.report;
  const lines = [
    '### Mobile JS bundle (iOS)',
    '',
    '| | staging | this PR | change |',
    '| --- | ---: | ---: | ---: |',
    sizeRow('Hermes bytecode', base?.bytecode.raw, head.bytecode.raw),
    sizeRow('Hermes bytecode, gzip', base?.bytecode.gzip, head.bytecode.gzip),
    sizeRow('Minified JS', base?.js.raw, head.js.raw),
    sizeRow(`Bundled assets (${head.assets.count} files)`, base?.assets.bytes, head.assets.bytes),
    '',
  ];
  if (base) {
    const names = new Set([...Object.keys(base.groups), ...Object.keys(head.groups)]);
    const changes = [...names]
      .map((name) => ({ name, base: base.groups[name] ?? 0, head: head.groups[name] ?? 0 }))
      .filter((row) => Math.abs(row.head - row.base) >= 512)
      .sort((a, b) => Math.abs(b.head - b.base) - Math.abs(a.head - a.base))
      .slice(0, 15);
    if (changes.length > 0) {
      lines.push(
        '<details><summary>What changed in the minified JS</summary>',
        '',
        '| Package or folder | staging | this PR | change |',
        '| --- | ---: | ---: | ---: |',
        ...changes.map(
          (row) =>
            `| \`${row.name}\` | ${formatBytes(row.base)} | ${formatBytes(row.head)} | ${row.base === 0 ? 'new' : formatDelta(row.base, row.head)} |`,
        ),
        '',
        '</details>',
        '',
      );
    }
    const growth = head.bytecode.raw - base.bytecode.raw;
    const percent = (growth / base.bytecode.raw) * 100;
    if (
      growth > budgets.mobile.maxBytecodeGrowthKb * 1024 &&
      percent > budgets.mobile.maxBytecodeGrowthPercent
    ) {
      warnings.push(
        `The mobile Hermes bundle grew by ${formatBytes(growth)} (${percent.toFixed(1)}%), over the ${budgets.mobile.maxBytecodeGrowthKb} KB and ${budgets.mobile.maxBytecodeGrowthPercent}% budget.`,
      );
    }
  }
  const top = Object.entries(head.groups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  lines.push(
    '<details><summary>Largest parts of the bundle</summary>',
    '',
    '| Package or folder | Minified JS | Share |',
    '| --- | ---: | ---: |',
    ...top.map(
      ([name, bytes]) =>
        `| \`${name}\` | ${formatBytes(bytes)} | ${((bytes / head.js.raw) * 100).toFixed(1)}% |`,
    ),
    '',
    '</details>',
    '',
  );
  return lines;
};

const renderWebsite = (
  data: Comparison<WebsiteReport>,
  warnings: string[],
  budgets: Budgets,
): string[] => {
  const base = data.base?.report;
  const head = data.head.report;
  const basePages = new Map(base?.pages.map((page) => [page.route, page]));
  const lines = [
    '### Website (static export)',
    '',
    '| Page | JS loaded, gzip | change | CSS, gzip | HTML, gzip |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...head.pages.map((page) => {
      const before = basePages.get(page.route);
      if (page.js > budgets.website.maxPageJsGzipKb * 1024) {
        warnings.push(
          `\`${page.route}\` loads ${formatBytes(page.js)} of gzipped JS, over the ${budgets.website.maxPageJsGzipKb} KB budget.`,
        );
      }
      return `| \`${page.route}\` | ${formatBytes(page.js)} | ${base ? formatDelta(before?.js, page.js) : '-'} | ${formatBytes(page.css)} | ${formatBytes(page.html)} |`;
    }),
    '',
    '| | staging | this PR | change |',
    '| --- | ---: | ---: | ---: |',
    sizeRow('All JS, gzip', base?.js.gzip, head.js.gzip),
    sizeRow('All CSS, gzip', base?.css.gzip, head.css.gzip),
    sizeRow(`Whole export (${head.output.count} files)`, base?.output.bytes, head.output.bytes),
    '',
  ];
  if (base && base.js.gzip > 0) {
    const percent = ((head.js.gzip - base.js.gzip) / base.js.gzip) * 100;
    if (percent > budgets.website.maxJsGrowthPercent) {
      warnings.push(
        `Website JS grew by ${percent.toFixed(1)}% gzipped, over the ${budgets.website.maxJsGrowthPercent}% budget.`,
      );
    }
  }
  if (head.lighthouse.length > 0) {
    const baseRuns = new Map(base?.lighthouse.map((run) => [run.url, run]));
    lines.push(
      `**Lighthouse** (mobile, median of ${head.lighthouse[0].runs} runs, change against staging in brackets)`,
      '',
      `| Page | ${CATEGORIES.map((key) => CATEGORY_LABELS[key]).join(' | ')} | LCP | TBT | CLS |`,
      `| --- | ${CATEGORIES.map(() => '---:').join(' | ')} | ---: | ---: | ---: |`,
      ...head.lighthouse.map((run) => {
        const before = baseRuns.get(run.url);
        for (const key of CATEGORIES) {
          const min = budgets.lighthouse.minScores[key];
          if (min !== undefined && run.scores[key] < min) {
            warnings.push(
              `Lighthouse ${CATEGORY_LABELS[key]} on \`${run.url}\` is ${run.scores[key]}, under the ${min} budget.`,
            );
          }
          const drop = (before?.scores[key] ?? run.scores[key]) - run.scores[key];
          if (drop > budgets.lighthouse.maxScoreDrop) {
            warnings.push(
              `Lighthouse ${CATEGORY_LABELS[key]} on \`${run.url}\` dropped ${drop} points against staging.`,
            );
          }
        }
        const scores = CATEGORIES.map((key) =>
          formatScoreDelta(before?.scores[key], run.scores[key]),
        );
        return `| \`${run.url}\` | ${scores.join(' | ')} | ${formatMs(run.metrics['largest-contentful-paint'])} | ${formatMs(run.metrics['total-blocking-time'])} | ${run.metrics['cumulative-layout-shift'].toFixed(3)} |`;
      }),
      '',
    );
  }
  return lines;
};

const render = (args: Record<string, string>) => {
  const budgets = readJson<Budgets>(args.budgets);
  if (!budgets) throw new Error('Pass --budgets <file>');
  const mobileData = readJson<Comparison<MobileReport>>(args.mobile);
  const websiteData = readJson<Comparison<WebsiteReport>>(args.website);
  const warnings: string[] = [];
  const sections = [
    ...(mobileData ? renderMobile(mobileData, warnings, budgets) : []),
    ...(websiteData ? renderWebsite(websiteData, warnings, budgets) : []),
  ];
  const base = mobileData?.base ?? websiteData?.base;
  const head = mobileData?.head ?? websiteData?.head;
  const intro = head
    ? `Built from ${short(head.sha)}${base ? `, compared with staging at ${short(base.sha)}` : ', with no staging build to compare against'}. This comment updates on every push.`
    : 'Nothing was measured.';
  const mode = budgets.enforce
    ? 'These fail the check.'
    : 'Warnings only for now, nothing is blocked.';
  const budgetLines =
    warnings.length > 0
      ? [`**Over budget.** ${mode}`, '', ...warnings.map((warning) => `- ${warning}`), '']
      : ['All size and Lighthouse budgets pass.', ''];
  const body = [MARKER, '## Size and performance', '', intro, '', ...budgetLines, ...sections].join(
    '\n',
  );
  writeOut(args.out, `${body.trimEnd()}\n`);
  for (const warning of warnings)
    process.stdout.write(`::warning::${warning.replaceAll('`', '')}\n`);
  if (budgets.enforce && warnings.length > 0) process.exitCode = 1;
};

const compare = (args: Record<string, string>) => {
  const head = readJson<unknown>(args.head);
  if (!head) throw new Error('Pass --head <file>');
  const base = readJson<unknown>(args.base);
  const result = {
    base: base ? { sha: args['base-sha'], report: base } : null,
    head: { sha: args['head-sha'], report: head },
  };
  writeOut(args.out, `${JSON.stringify(result)}\n`);
};

const writeOut = (path: string, contents: string) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
};

const parseArgs = (argv: string[]): Record<string, string> => {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--')) throw new Error(`Unexpected argument ${argv[i]}`);
    args[argv[i].slice(2)] = argv[i + 1];
  }
  return args;
};

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

if (command === 'mobile') {
  writeOut(args.out, `${JSON.stringify(mobile(args.bytecode, args.js))}\n`);
} else if (command === 'website') {
  writeOut(args.out, `${JSON.stringify(website(args.dir, args.lighthouse ?? ''))}\n`);
} else if (command === 'compare') {
  compare(args);
} else if (command === 'render') {
  render(args);
} else {
  process.stderr.write('usage: size-report.ts mobile|website|compare|render --flag value ...\n');
  process.exitCode = 2;
}
