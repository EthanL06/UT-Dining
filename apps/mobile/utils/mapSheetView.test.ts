import { describe, expect, it } from 'vitest';
import { browseView, searchView } from './mapSheetView';

describe('browseView', () => {
  it('shows loading until places load, then the list or the empty state', () => {
    expect(browseView(false, 0)).toEqual({ kind: 'loading' });
    expect(browseView(true, 0)).toEqual({ kind: 'empty' });
    expect(browseView(true, 12)).toEqual({ kind: 'list' });
  });
});

describe('searchView', () => {
  const base = { query: 'piz', searchedQuery: 'piz', isLoaded: true, resultCount: 0 };

  it('shows suggestions for a blank query', () => {
    expect(searchView({ ...base, query: '  ' })).toEqual({ kind: 'suggestions' });
  });

  it('waits instead of saying no results while places load', () => {
    expect(searchView({ ...base, isLoaded: false })).toEqual({ kind: 'pending' });
  });

  it('waits instead of saying no results while the search catches up with typing', () => {
    expect(searchView({ ...base, query: 'pizz' })).toEqual({ kind: 'pending' });
    expect(searchView({ ...base, query: 'pizz', resultCount: 3 })).toEqual({ kind: 'results' });
  });

  it('says no results only once the search has run on what was typed', () => {
    expect(searchView({ ...base, query: 'piz ' })).toEqual({ kind: 'empty', query: 'piz' });
    expect(searchView({ ...base, resultCount: 2 })).toEqual({ kind: 'results' });
  });
});
