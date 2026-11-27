export type BrowseView = { kind: 'loading' } | { kind: 'empty' } | { kind: 'list' };

export const browseView = (isLoaded: boolean, visibleCount: number): BrowseView => {
  if (!isLoaded) return { kind: 'loading' };
  return visibleCount === 0 ? { kind: 'empty' } : { kind: 'list' };
};

export type SearchView =
  | { kind: 'suggestions' }
  | { kind: 'pending' }
  | { kind: 'empty'; query: string }
  | { kind: 'results' };

export const searchView = ({
  query,
  searchedQuery,
  isLoaded,
  resultCount,
}: {
  query: string;
  searchedQuery: string;
  isLoaded: boolean;
  resultCount: number;
}): SearchView => {
  const trimmed = query.trim();
  if (trimmed === '') return { kind: 'suggestions' };
  if (!isLoaded) return { kind: 'pending' };
  if (searchedQuery !== trimmed) return resultCount > 0 ? { kind: 'results' } : { kind: 'pending' };
  return resultCount > 0 ? { kind: 'results' } : { kind: 'empty', query: trimmed };
};
