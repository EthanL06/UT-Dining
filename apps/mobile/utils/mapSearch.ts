export type Searchable = {
  name: string;
  locationName?: string;
  address: string;
  type: string;
};

export type MatchReason = 'name' | 'building' | 'type';

export type SearchMatch<T extends Searchable> = {
  place: T;
  score: number;
  reason: MatchReason;
  building: string | null;
};

const BUILDINGS: { name: string; addresses: string[]; aliases: string[] }[] = [
  { name: 'Jester', addresses: ['201 e 21st'], aliases: ['jester', 'jcl', 'j2'] },
  { name: 'Texas Union', addresses: ['2308 whitis'], aliases: ['union', 'texas union'] },
  {
    name: 'WCP',
    addresses: ['2201 speedway'],
    aliases: ['wcp', 'welch', 'student activity center'],
  },
  { name: 'Kinsolving', addresses: ['2605 whitis'], aliases: ['kins', 'kinsolving'] },
  { name: 'Dobie', addresses: ['2021 guadalupe'], aliases: ['dobie'] },
  { name: 'Blanton', addresses: ['1900 university'], aliases: ['blanton', 'aac', 'alumni center'] },
];

const TYPE_WORDS: Record<string, string[]> = {
  'Coffee Shop': ['coffee', 'cafe', 'espresso', 'latte'],
  'Convenience Store': ['market', 'store', 'convenience', 'snacks', 'groceries'],
  'Dining Hall': ['dining hall', 'dining', 'buffet', 'hall'],
  'Food & Drink': ['food', 'restaurant', 'eat'],
  'Food Truck': ['food truck', 'truck', 'trucks'],
  microwave: ['microwave', 'microwaves'],
};

export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’‘`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const withinOneEdit = (a: string, b: string) => {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    edits++;
    if (edits > 1) return false;
    if (a[i + 1] === b[j] && a[i] === b[j + 1]) {
      i += 2;
      j += 2;
    } else if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
};

const scoreText = (text: string, needle: string) => {
  if (text === needle) return 100;
  if (text.startsWith(needle)) return 90;
  const words = text.split(' ');
  if (words.some((word) => word.startsWith(needle))) return 75;
  if (text.includes(needle)) return 60;
  const compact = text.replace(/ /g, '');
  if (compact.includes(needle.replace(/ /g, ''))) return 55;
  const needleWords = needle.split(' ');
  if (
    needleWords.every(
      (part) =>
        part.length >= 4 &&
        words.some(
          (word) => withinOneEdit(word.slice(0, part.length), part) || withinOneEdit(word, part),
        ),
    )
  )
    return 40;
  return 0;
};

export const buildingFor = (address: string) => {
  const normalized = normalize(address);
  return BUILDINGS.find((building) =>
    building.addresses.some((prefix) => normalized.startsWith(normalize(prefix))),
  );
};

const scorePlace = <T extends Searchable>(place: T, needle: string): SearchMatch<T> | null => {
  const building = buildingFor(place.address) ?? null;
  const nameScore = Math.max(
    scoreText(normalize(place.name), needle),
    place.locationName ? scoreText(normalize(place.locationName), needle) : 0,
  );
  if (nameScore > 0) {
    return { place, score: nameScore, reason: 'name', building: building?.name ?? null };
  }
  if (building?.aliases.some((alias) => scoreText(alias, needle) >= 75)) {
    return { place, score: 30, reason: 'building', building: building.name };
  }
  if ((TYPE_WORDS[place.type] ?? []).some((word) => scoreText(word, needle) >= 75)) {
    return { place, score: 20, reason: 'type', building: building?.name ?? null };
  }
  return null;
};

export const searchPlaces = <T extends Searchable>(
  places: T[],
  query: string,
): SearchMatch<T>[] => {
  const needle = normalize(query);
  if (needle === '') return [];
  return places
    .map((place) => scorePlace(place, needle))
    .filter((match): match is SearchMatch<T> => match !== null)
    .sort((a, b) => b.score - a.score);
};

export type FoodRow = { food: string; location: string; menu: string };

export type MenuMatch = { locationName: string; foods: string[]; menus: string[] };

const unique = (values: string[]) => [...new Set(values)];

export const groupMenuMatches = (rows: FoodRow[], maxFoods = 3): MenuMatch[] => {
  const byLocation = new Map<string, FoodRow[]>();
  for (const row of rows) {
    byLocation.set(row.location, [...(byLocation.get(row.location) ?? []), row]);
  }
  return [...byLocation.entries()]
    .map(([locationName, matches]) => ({
      locationName,
      foods: unique(matches.map((match) => match.food)).slice(0, maxFoods),
      menus: unique(matches.map((match) => match.menu)),
      count: matches.length,
    }))
    .sort((a, b) => b.count - a.count || a.locationName.localeCompare(b.locationName))
    .map(({ count: _count, ...match }) => match);
};

export type BuildingMatch = { name: string; count: number };

export const matchBuildings = <T extends Searchable>(
  places: T[],
  query: string,
): BuildingMatch[] => {
  const needle = normalize(query);
  if (needle === '') return [];
  return BUILDINGS.filter((building) =>
    [normalize(building.name), ...building.aliases].some((alias) => scoreText(alias, needle) >= 75),
  )
    .map((building) => ({
      name: building.name,
      count: places.filter((place) => buildingFor(place.address)?.name === building.name).length,
    }))
    .filter((building) => building.count > 1);
};

export type RecentSearch = { kind: 'place'; name: string } | { kind: 'query'; query: string };

const recentKey = (recent: RecentSearch) =>
  recent.kind === 'place' ? `place:${recent.name}` : `query:${normalize(recent.query)}`;

export const addRecent = (recents: RecentSearch[], recent: RecentSearch, max = 5) => {
  if (recent.kind === 'query' && normalize(recent.query) === '') return recents;
  const key = recentKey(recent);
  return [recent, ...recents.filter((item) => recentKey(item) !== key)].slice(0, max);
};
