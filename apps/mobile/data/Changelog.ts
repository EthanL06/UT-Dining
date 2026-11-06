export interface ChangelogChange {
  title: string;
  description?: string;
}

export interface ChangelogEntry {
  version: string;
  date?: string;
  summary?: string;
  changes: ChangelogChange[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.3.0',
    summary: 'A faster, more accurate UT Dining.',
    changes: [
      {
        title: 'Instant launch',
        description: 'Menus you have already loaded show right away, even before a sync finishes.',
      },
      {
        title: 'Faster menu switching',
        description: 'Changing meals, dates and locations no longer has a delay.',
      },
      {
        title: 'Smarter syncing',
        description:
          'Only the menu days that changed are downloaded, and a failed sync keeps your saved menus.',
      },
      {
        title: 'More accurate allergens and nutrition',
        description:
          'Every recipe now keeps its full allergen list, and unknown nutrients are left blank instead of showing 0.',
      },
      {
        title: 'Liquid Glass tab bar',
        description: 'The tab bar uses the new iOS look and follows the in-app dark mode setting.',
      },
      {
        title: "What's New",
        description: 'See what changed after every update, or anytime from Settings.',
      },
      {
        title: 'Fixes',
        description:
          'Food details match the selected date, hours stay current after a sync, food card swipes work again, and the map sheet updates when you tap another pin.',
      },
    ],
  },
  {
    version: '1.2.4',
    changes: [
      { title: 'Faster menu loading', description: 'Menus load with fewer database queries.' },
    ],
  },
  {
    version: '1.2.3',
    date: '2025-08-21',
    changes: [{ title: "Fixed a bug that kept food's nutrition information from loading" }],
  },
  {
    version: '1.2.2',
    date: '2025-08-19',
    changes: [
      {
        title: 'Refreshed dark mode',
        description: 'A cleaner color palette with better contrast and spacing for easier reading.',
      },
      {
        title: 'Decimal quantities in the Meal Planner',
        description: 'Enter fractional quantities like 0.5 servings for more accurate planning.',
      },
      { title: 'Performance improvements and bug fixes' },
    ],
  },
  {
    version: '1.2.0',
    date: '2025-08-03',
    summary: 'Our biggest update yet.',
    changes: [
      {
        title: 'Past and future menus',
        description: 'Know what is being served before and after you go.',
      },
      {
        title: 'Interactive campus map',
        description: 'Quickly find what is nearby.',
      },
      {
        title: '50+ new locations',
        description: 'Food trucks, new restaurants, cafés and more.',
      },
      {
        title: 'Push notifications',
        description: 'Get alerts about closures, hours and new menus.',
      },
      {
        title: 'Offline mode',
        description: 'Access menus and hours without a connection.',
      },
      { title: 'Refreshed design', description: 'Sleeker, smoother and easier to navigate.' },
      { title: 'New onboarding', description: 'Start exploring faster than ever.' },
    ],
  },
];

export const getChangelogEntry = (version: string | null | undefined) =>
  CHANGELOG.find((entry) => entry.version === version);
