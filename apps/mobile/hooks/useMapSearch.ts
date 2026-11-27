import { useMemo, useState } from 'react';
import type { PlaceMenuMatch, ResolvedRecent } from '~/components/map/SearchPanel';
import { useDatabase } from '~/hooks/useDatabase';
import { useDebounce } from '~/hooks/useDebounce';
import { searchFoodsServed } from '~/services/database/menus';
import { useMapRecentsStore } from '~/store/useMapRecentsStore';
import { getTodayInCentralTime } from '~/utils/date';
import type { Place } from '~/utils/mapPlaces';
import { groupMenuMatches, matchBuildings, searchPlaces } from '~/utils/mapSearch';

export type MapSearchState =
  | { status: 'browsing' }
  | { status: 'searching'; query: string }
  | { status: 'place'; name: string; query: string | null; foods: string[] };

const MIN_FOOD_QUERY = 3;

const placeKey = (place: Place) => place.locationName ?? place.name;

export const useMapSearch = (places: Place[]) => {
  const db = useDatabase();
  const [search, setSearch] = useState<MapSearchState>({ status: 'browsing' });
  const recentItems = useMapRecentsStore((state) => state.recents);
  const remember = useMapRecentsStore((state) => state.remember);
  const clearRecents = useMapRecentsStore((state) => state.clear);

  const query =
    search.status === 'searching'
      ? search.query
      : search.status === 'place'
        ? (search.query ?? '')
        : '';
  const debounced = useDebounce(query.trim(), 150);

  const results = useMemo(() => searchPlaces(places, debounced), [places, debounced]);
  const buildings = useMemo(() => matchBuildings(places, debounced), [places, debounced]);

  const menuMatches: PlaceMenuMatch[] = useMemo(() => {
    if (debounced.length < MIN_FOOD_QUERY) return [];
    const rows = searchFoodsServed(db, debounced, getTodayInCentralTime()).flatMap((row) =>
      row.food && row.location && row.menu
        ? [{ food: row.food, location: row.location, menu: row.menu }]
        : [],
    );
    return groupMenuMatches(rows).flatMap((match) => {
      const place = places.find((candidate) => placeKey(candidate) === match.locationName);
      return place ? [{ place, foods: match.foods, menus: match.menus }] : [];
    });
  }, [db, debounced, places]);

  const recents: ResolvedRecent[] = recentItems.flatMap((recent): ResolvedRecent[] => {
    if (recent.kind === 'query') return [recent];
    const place = places.find(
      (candidate) => placeKey(candidate) === recent.name || candidate.name === recent.name,
    );
    return place ? [{ kind: 'place', place }] : [];
  });

  const selectedPlace =
    search.status === 'place' ? (places.find((place) => place.name === search.name) ?? null) : null;

  return {
    search,
    query,
    results,
    buildings,
    menuMatches,
    recents,
    selectedPlace,
    selectedFoods: search.status === 'place' ? search.foods : [],
    clearRecents,
    focus: () =>
      setSearch((current) =>
        current.status === 'searching' ? current : { status: 'searching', query },
      ),
    setQuery: (next: string) => setSearch({ status: 'searching', query: next }),
    submit: (next = query) => {
      remember({ kind: 'query', query: next.trim() });
      setSearch({ status: 'searching', query: next });
    },
    cancel: () => setSearch({ status: 'browsing' }),
    pick: (place: Place, foods: string[] = []) => {
      const fromQuery = search.status === 'searching' && query.trim() !== '' ? query : null;
      if (search.status === 'searching') remember({ kind: 'place', name: placeKey(place) });
      setSearch({
        status: 'place',
        name: place.name,
        query: search.status === 'place' ? search.query : fromQuery,
        foods,
      });
    },
    back: () =>
      setSearch((current) =>
        current.status === 'place' && current.query !== null
          ? { status: 'searching', query: current.query }
          : { status: 'browsing' },
      ),
    close: () => setSearch({ status: 'browsing' }),
  };
};
