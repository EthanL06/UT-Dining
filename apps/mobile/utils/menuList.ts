export type MenuStatus = 'loading' | 'error' | 'none' | 'ready';

export type MenuEmptyState =
  | { kind: 'skeleton' }
  | { kind: 'syncing' }
  | { kind: 'message'; title: string; subtitle: string };

export const menuEmptyState = ({
  menu,
  syncing,
  searching,
  filtering,
}: {
  menu: MenuStatus;
  syncing: boolean;
  searching: boolean;
  filtering: boolean;
}): MenuEmptyState => {
  if (menu === 'loading') return { kind: 'skeleton' };
  if (syncing) return { kind: 'syncing' };
  if (menu === 'error') {
    return {
      kind: 'message',
      title: 'Error Loading Menu',
      subtitle: 'There was an error loading the menu. Please try again.',
    };
  }
  if (menu === 'none') {
    return {
      kind: 'message',
      title: 'No menu for this day',
      subtitle: "UT hasn't posted a menu here for this day.",
    };
  }
  const subtitle = searching
    ? 'Try a different search term.'
    : filtering
      ? 'Try adjusting your filters.'
      : 'Please try again later.';
  return { kind: 'message', title: 'No items found.', subtitle };
};
