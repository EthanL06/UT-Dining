import { useCallback, useState } from 'react';

export type MultiSelect = { mode: 'browsing' } | { mode: 'selecting'; ids: ReadonlySet<string> };

const BROWSING: MultiSelect = { mode: 'browsing' };
const NO_IDS: ReadonlySet<string> = new Set();

export const toggleSelected = (selection: MultiSelect, id: string): MultiSelect => {
  if (selection.mode === 'browsing') return selection;
  const ids = new Set(selection.ids);
  if (ids.has(id)) ids.delete(id);
  else ids.add(id);
  return { mode: 'selecting', ids };
};

export function useMultiSelect() {
  const [selection, setSelection] = useState<MultiSelect>(BROWSING);

  const start = useCallback((id: string) => {
    setSelection({ mode: 'selecting', ids: new Set([id]) });
  }, []);

  const toggle = useCallback((id: string) => {
    setSelection((current) => toggleSelected(current, id));
  }, []);

  const stop = useCallback(() => {
    setSelection((current) => (current.mode === 'browsing' ? current : BROWSING));
  }, []);

  return {
    selecting: selection.mode === 'selecting',
    selectedIds: selection.mode === 'selecting' ? selection.ids : NO_IDS,
    start,
    toggle,
    stop,
  };
}
