export const displayLocationName = (
  location: { name: string | null; colloquial_name: string | null },
  useColloquial: boolean,
): string => (useColloquial && location.colloquial_name) || location.name || '';
