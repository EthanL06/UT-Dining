import fs from 'node:fs';
import path from 'node:path';

const mobile = path.resolve(process.argv[2] ?? 'apps/mobile');
const here = path.dirname(new URL(import.meta.url).pathname);

const renderCounters = [
  ['app/location/components/FoodItemRow.tsx', 'FoodItemRow'],
  ['app/location/components/CategoryHeader.tsx', 'CategoryHeader'],
  ['components/FoodComponent.tsx', 'FoodComponent'],
];

const edits = [
  {
    file: 'app/_layout.tsx',
    prepend: "import '~/utils/perf';\n",
  },
  {
    file: 'app/(tabs)/(home)/index.tsx',
    prepend:
      "import { hooks as perfHooks, painted, runHarness, usePerfRender } from '~/utils/perf';\n",
    anchors: [
      [/export default function Home\(\) \{\n/, (m) => `${m}  usePerfRender('home');\n`],
      [
        /\n {2}const handleRefresh = async \(\) => \{\n/,
        (m) =>
          `\n  useEffect(() => {\n    if (!data || data.locations.length === 0) return;\n    painted('home.ready', { locations: data.locations.length });\n    runHarness(drizzleDb, queryClient);\n  }, [data]);\n  perfHooks.home = { setSelectedFilter, types: data?.locationTypes };\n${m}`,
      ],
    ],
  },
  {
    file: 'utils/queries.ts',
    prepend: "import { syncEnded, syncStarted } from '~/utils/perf';\n",
    anchors: [
      [/const syncWithSupabase = singleFlight\(async [^\n]*\n/, (m) => `${m}  syncStarted();\n`],
      [/\n {2}store\.setLastSupabaseQueryTime\(Date\.now\(\)\);\n/, (m) => `\n  syncEnded();${m}`],
    ],
  },
  {
    file: 'services/database/sync.ts',
    prepend: "import { mark as perfMark } from '~/utils/perf';\n",
    anchors: [
      [
        /( *)const \[shared, remote\] = await Promise\.all\(\[[^\n]*\n/,
        (m, indent) => `${m}${indent}perfMark('sync.fetched');\n`,
      ],
      [
        /( *)await runStatements\(db, sharedTableStatements\(db, shared\)\);\n/,
        (m, indent) =>
          `${indent}const perfShared = Date.now();\n${m}${indent}perfMark('sync.sharedWrite', { ms: Date.now() - perfShared });\n`,
      ],
      [
        /( *)await runStatements\(db, menuDayStatements\(db, date, rows\)\);\n/,
        (m, indent) =>
          `${indent}const perfDay = Date.now();\n${m}${indent}perfMark('sync.dayWrite', { date, ms: Date.now() - perfDay, foods: rows.food_item.length });\n`,
      ],
    ],
  },
  {
    file: 'app/location/[location].tsx',
    prepend: "import { hooks as perfHooks, usePerfLocation, usePerfRender } from '~/utils/perf';\n",
    anchors: [
      [
        /\n {2}const selectedEntries = useMemo\(/,
        (m) =>
          `\n  perfHooks.loc = { setSearchQuery, toggleCategory, startSelecting, stopSelecting, items: displayedItems, db, location, selectedMenu };\n  usePerfLocation(menuStatus, displayedItems, debouncedSearchQuery);\n  usePerfRender('location');${m}`,
      ],
    ],
  },
  {
    file: 'app/(tabs)/search/index.tsx',
    prepend: "import { hooks as perfHooks, usePerfRender } from '~/utils/perf';\n",
    append: '\nperfHooks.searchToday = searchToday;\n',
    anchors: [
      [/export default function Search\(\) \{\n/, (m) => `${m}  usePerfRender('search');\n`],
      [
        /\n {2}const \[query, setQuery\] = useState\(''\);\n/,
        (m) => `${m}  perfHooks.setSearchTabQuery = setQuery;\n`,
      ],
    ],
  },
  {
    file: 'app/location_generic/[location].tsx',
    prepend: "import { mark as perfMark, perfImageUri } from '~/utils/perf';\n",
    anchors: [
      [
        /source=\{\{ uri: locationData\.image as string \}\}/,
        () =>
          "source={{ uri: perfImageUri(locationData.image as string) }}\n              onLoad={() => perfMark('image.loaded')}",
      ],
      [
        /onError=\{\(\) => setImageFailed\(true\)\}/,
        () =>
          "onError={() => {\n                perfMark('image.error');\n                setImageFailed(true);\n              }}",
      ],
    ],
  },
  {
    file: 'hooks/useNow.ts',
    prepend: "import { hooks as perfHooks } from '~/utils/perf';\n",
    anchors: [
      [
        /( *)const interval = setInterval\(refresh, intervalMs\);\n/,
        (m, indent) =>
          `${m}${indent}perfHooks.nowRefreshers = [...(perfHooks.nowRefreshers ?? []), refresh];\n`,
      ],
      [
        /( *)clearInterval\(interval\);\n/,
        (m, indent) =>
          `${m}${indent}perfHooks.nowRefreshers = perfHooks.nowRefreshers.filter((r: () => void) => r !== refresh);\n`,
      ],
    ],
  },
  ...renderCounters.map(([file, name]) => ({
    file,
    prepend: "import { usePerfRender } from '~/utils/perf';\n",
    anchors: [
      [
        new RegExp(`const ${name} = (?:React\\.memo\\()?\\([\\s\\S]*?\\) => \\{\\n`),
        (m) => `${m}  usePerfRender('${name}');\n`,
      ],
    ],
  })),
];

const failures = [];
const changed = [];
for (const edit of edits) {
  const file = path.join(mobile, edit.file);
  let src = fs.readFileSync(file, 'utf8');
  for (const [re, fn] of edit.anchors ?? []) {
    const hits = src.match(new RegExp(re.source, 'g'))?.length ?? 0;
    if (hits !== 1) {
      failures.push(`${edit.file}: ${re} matched ${hits} times`);
      continue;
    }
    src = src.replace(re, fn);
  }
  src = (edit.prepend ?? '') + src + (edit.append ?? '');
  fs.writeFileSync(file, src);
  changed.push(edit.file);
}
fs.copyFileSync(path.join(here, 'perf.ts'), path.join(mobile, 'utils/perf.ts'));
if (failures.length) {
  console.error(
    `instrument: anchors not found, update scripts/qa/perf/instrument.mjs\n${failures.join('\n')}`,
  );
  process.exit(1);
}
console.log(`instrumented ${changed.length} files`);
