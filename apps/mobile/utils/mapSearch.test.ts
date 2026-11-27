import { describe, expect, it } from 'vitest';
import {
  addRecent,
  buildingFor,
  groupMenuMatches,
  matchBuildings,
  normalize,
  type RecentSearch,
  searchPlaces,
} from './mapSearch';

const place = (name: string, address: string, type: string, locationName?: string) => ({
  name,
  address,
  type,
  locationName,
});

const PLACES = [
  place('Jester Java', '201 E 21st St Austin, TX 78705', 'Coffee Shop'),
  place('Jarket', '201 E 21st St Austin, TX 78705', 'Convenience Store', 'Jester City Market'),
  place('J2', '201 E 21st St Austin, TX 78705', 'Dining Hall', 'J2 Dining'),
  place("Jizza's", '201 E 21st St Austin, TX 78705', 'Food & Drink', "Jesta' Pizza"),
  place('Moontower Cafè', '300 W Martin Luther King Blvd. Austin, TX 78705', 'Coffee Shop'),
  place('Hook ’em Hut – WCP', '2201 Speedway Austin, TX 78712', 'Convenience Store'),
  place("Prufrock's", '101 E 21st St, Austin, TX 78705', 'Coffee Shop', "Prufrock's Coffee"),
  place('Kriya Matcha', 'UT Austin campus, Austin, TX 78705', 'Food Truck'),
  place('Chick-fil-A – WCP', '2201 Speedway Austin, TX 78712', 'Food & Drink'),
];

const names = (query: string) => searchPlaces(PLACES, query).map((match) => match.place.name);

describe('normalize', () => {
  it('drops accents, apostrophes and punctuation', () => {
    expect(normalize('Moontower Cafè')).toBe('moontower cafe');
    expect(normalize('Hook ’em Hut – WCP')).toBe('hook em hut wcp');
    expect(normalize("O's Campus Café")).toBe('os campus cafe');
  });
});

describe('searchPlaces', () => {
  it('returns nothing for a blank query', () => {
    expect(searchPlaces(PLACES, '  ')).toEqual([]);
  });

  it('ignores accents and apostrophes', () => {
    expect(names('cafe')).toContain('Moontower Cafè');
    expect(names('hook em')).toEqual(['Hook ’em Hut – WCP']);
    expect(names('prufrocks')[0]).toBe("Prufrock's");
  });

  it('matches the official name when colloquial names are shown', () => {
    expect(names('pizza')).toEqual(["Jizza's"]);
  });

  it('ranks name matches above places in the same building', () => {
    const results = searchPlaces(PLACES, 'jester');
    expect(results.slice(0, 2).map((match) => match.reason)).toEqual(['name', 'name']);
    expect(results.map((match) => match.place.name)).toEqual(
      expect.arrayContaining(['J2', "Jizza's"]),
    );
    expect(results.find((match) => match.place.name === 'J2')?.reason).toBe('building');
    expect(results.find((match) => match.place.name === "Jizza's")?.reason).toBe('building');
  });

  it('finds every place in a building by its name', () => {
    expect(names('wcp').sort()).toEqual(['Chick-fil-A – WCP', 'Hook ’em Hut – WCP']);
    expect(names('union')).toEqual([]);
  });

  it('matches the place type', () => {
    const results = searchPlaces(PLACES, 'truck');
    expect(results.map((match) => [match.place.name, match.reason])).toEqual([
      ['Kriya Matcha', 'type'],
    ]);
  });

  it('tolerates one typo in longer words', () => {
    expect(names('moontwer')).toEqual(['Moontower Cafè']);
    expect(names('matcah')).toEqual(['Kriya Matcha']);
  });

  it('ranks a name match above a type match', () => {
    const results = searchPlaces(PLACES, 'cafe');
    expect(results[0].place.name).toBe('Moontower Cafè');
    expect(results.slice(1).every((match) => match.reason === 'type')).toBe(true);
  });
});

describe('buildingFor', () => {
  it('reads the building from a shared street address', () => {
    expect(buildingFor('201 E 21st St. Austin, TX 78712')?.name).toBe('Jester');
    expect(buildingFor('2308 Whitis Avenue Austin, TX 78712')?.name).toBe('Texas Union');
    expect(buildingFor('UT Austin campus')).toBeUndefined();
  });
});

describe('groupMenuMatches', () => {
  it('groups foods by location, most matches first, without repeats', () => {
    const rows = [
      { food: 'Cheese Pizza', location: 'Kins Dining', menu: 'Lunch' },
      { food: 'Pepperoni Pizza', location: 'J2 Dining', menu: 'Lunch' },
      { food: 'Cheese Pizza', location: 'J2 Dining', menu: 'Lunch' },
      { food: 'Cheese Pizza', location: 'J2 Dining', menu: 'Dinner' },
    ];
    expect(groupMenuMatches(rows)).toEqual([
      {
        locationName: 'J2 Dining',
        foods: ['Pepperoni Pizza', 'Cheese Pizza'],
        menus: ['Lunch', 'Dinner'],
      },
      { locationName: 'Kins Dining', foods: ['Cheese Pizza'], menus: ['Lunch'] },
    ]);
  });
});

describe('matchBuildings', () => {
  it('suggests a building that holds more than one place', () => {
    expect(matchBuildings(PLACES, 'jes')).toEqual([{ name: 'Jester', count: 4 }]);
    expect(matchBuildings(PLACES, 'wcp')).toEqual([{ name: 'WCP', count: 2 }]);
    expect(matchBuildings(PLACES, 'dobie')).toEqual([]);
  });
});

describe('addRecent', () => {
  it('moves a repeat to the front and keeps five', () => {
    const start = [
      { kind: 'query' as const, query: 'boba' },
      { kind: 'place' as const, name: 'J2' },
    ];
    expect(addRecent(start, { kind: 'place', name: 'J2' })).toEqual([
      { kind: 'place', name: 'J2' },
      { kind: 'query', query: 'boba' },
    ]);
    expect(addRecent(start, { kind: 'query', query: 'BOBA ' })[0]).toEqual({
      kind: 'query',
      query: 'BOBA ',
    });
    expect(addRecent(start, { kind: 'query', query: '  ' })).toBe(start);
    const many = Array.from({ length: 6 }, (_, i) => ({ kind: 'query' as const, query: `q${i}` }));
    const kept = many.reduce<RecentSearch[]>((list, item) => addRecent(list, item), []);
    expect(kept.map((item) => (item.kind === 'query' ? item.query : ''))).toEqual([
      'q5',
      'q4',
      'q3',
      'q2',
      'q1',
    ]);
  });
});
