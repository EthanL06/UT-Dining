import type { Metadata } from 'next';
import Link from 'next/link';
import { AppStoreButton } from '@/components/AppStoreButton';
import { JsonLd } from '@/components/JsonLd';
import { Phone } from '@/components/Phone';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getChangelog } from '@/lib/changelog';
import {
  APP_STORE_URL,
  absoluteUrl,
  GITHUB_URL,
  pageMetadata,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from '@/lib/site';

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({ description: SITE_DESCRIPTION, path: '/' });

type Tile = {
  title: string;
  body: string;
  src: string;
  alt: string;
  span: string;
  tone: 'plain' | 'accent' | 'strong';
  layout: 'below' | 'beside';
};

const tiles: Tile[] = [
  {
    title: 'Open now',
    body: "Every dining hall, café and food truck, sorted by what's open and when it closes.",
    src: '/screenshots/home.jpg',
    alt: 'UT Dining home screen listing places that are open now',
    span: 'md:col-span-4 md:row-span-2',
    tone: 'accent',
    layout: 'beside',
  },
  {
    title: 'Every menu',
    body: 'The whole week, for breakfast, lunch and dinner.',
    src: '/screenshots/menu.jpg',
    alt: 'J2 lunch menu with a week strip and meal picker',
    span: 'md:col-span-2',
    tone: 'plain',
    layout: 'below',
  },
  {
    title: 'Search',
    body: "Find any food on today's menus in a second.",
    src: '/screenshots/search.jpg',
    alt: "Search results listing foods on today's menus with calories",
    span: 'md:col-span-2',
    tone: 'plain',
    layout: 'below',
  },
  {
    title: 'Nutrition',
    body: "Calories, macros and allergens for every item, with filters to hide what you can't eat.",
    src: '/screenshots/food.jpg',
    alt: 'Food detail with calories and macros',
    span: 'md:col-span-3',
    tone: 'plain',
    layout: 'beside',
  },
  {
    title: 'Meal Plan',
    body: 'Build your day and watch the totals add up.',
    src: '/screenshots/mealplan.jpg',
    alt: 'Meal Plan with daily calorie and macro totals',
    span: 'md:col-span-3',
    tone: 'plain',
    layout: 'beside',
  },
  {
    title: 'Favorites',
    body: 'See where your favorite foods are served today.',
    src: '/screenshots/favorites.jpg',
    alt: 'Favorites split into on a menu today and not today',
    span: 'md:col-span-2',
    tone: 'plain',
    layout: 'below',
  },
  {
    title: 'Campus map',
    body: '50+ places on one map, with directions and menus a tap away.',
    src: '/screenshots/map-card.jpg',
    alt: 'Campus map with a place card showing hours and directions',
    span: 'md:col-span-4',
    tone: 'strong',
    layout: 'beside',
  },
];

const toneClass = {
  plain: 'bg-tile text-ink',
  accent: 'bg-accent text-white',
  strong: 'bg-strong text-on-strong',
};

const bodyToneClass = {
  plain: 'text-muted',
  accent: 'text-on-accent-muted',
  strong: 'text-on-strong-muted',
};

function FeatureTile({ tile }: { tile: Tile }) {
  const big = tile.span.includes('row-span-2');
  return (
    <article
      className={`relative h-85 overflow-hidden rounded-[28px] md:h-auto ${tile.span} ${toneClass[tile.tone]}`}
    >
      <div
        className={`p-7 ${tile.layout === 'beside' ? 'md:max-w-[46%]' : ''} ${big ? 'md:p-9' : ''}`}
      >
        <h3 className={`font-bold tracking-tight ${big ? 'text-[30px]' : 'text-[22px]'}`}>
          {tile.title}
        </h3>
        <p className={`mt-1.5 leading-normal ${bodyToneClass[tile.tone]}`}>{tile.body}</p>
      </div>
      <Phone
        src={tile.src}
        alt={tile.alt}
        preload={big}
        className={
          tile.layout === 'below'
            ? 'absolute top-34 left-1/2 w-55 -translate-x-1/2'
            : big
              ? 'absolute top-40 left-1/2 w-60 -translate-x-1/2 md:top-24 md:left-[66%] md:w-75'
              : 'absolute top-34 left-1/2 w-55 -translate-x-1/2 md:top-9 md:left-[72%]'
        }
      />
    </article>
  );
}

export default async function Home() {
  const [latest] = await getChangelog();
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: absoluteUrl('/'),
        logo: absoluteUrl('/icon-512.png'),
        sameAs: [APP_STORE_URL, GITHUB_URL],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: absoluteUrl('/'),
        description: SITE_DESCRIPTION,
        inLanguage: 'en-US',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'MobileApplication',
        '@id': `${SITE_URL}/#app`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: absoluteUrl('/'),
        downloadUrl: APP_STORE_URL,
        installUrl: APP_STORE_URL,
        operatingSystem: 'iOS',
        applicationCategory: 'LifestyleApplication',
        ...(latest ? { softwareVersion: latest.version } : {}),
        image: absoluteUrl('/icon-512.png'),
        screenshot: tiles.map((tile) => absoluteUrl(tile.src)),
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <div className="min-h-screen">
      <JsonLd data={structuredData} />
      <SiteHeader />

      <main>
        <section className="mx-auto max-w-290 px-6 pt-16 pb-14 md:pt-18">
          <h1 className="max-w-225 text-[clamp(44px,8vw,80px)] leading-[0.98] font-bold tracking-[-0.045em]">
            Hungry? Here's everything open on campus.
          </h1>
          <div className="mt-7 flex flex-wrap items-end justify-between gap-6">
            <p className="text-muted max-w-120 text-[19px] leading-normal">
              Your companion for dining at UT Austin. Browse menus, check hours, and find your next
              meal.
            </p>
            <AppStoreButton />
          </div>
        </section>

        <section id="features" className="mx-auto max-w-290 scroll-mt-6 px-6">
          <h2 className="sr-only">Features</h2>
          <div className="grid grid-cols-1 gap-4 md:auto-rows-[300px] md:grid-cols-6">
            {tiles.map((tile) => (
              <FeatureTile key={tile.title} tile={tile} />
            ))}
          </div>
        </section>

        <section className="mx-auto mt-4 grid max-w-290 grid-cols-1 gap-4 px-6 md:grid-cols-2">
          <div className="bg-tile rounded-[28px] p-10">
            <h2 className="text-accent-text text-sm font-semibold">Why it exists</h2>
            <p className="mt-3 text-[22px] leading-[1.45] tracking-[-0.01em]">
              Figuring out where to eat on campus shouldn't be a chore. UT Dining gathers every
              spot, from dining halls to cafés and markets, into one simple app, built by students,
              for students.
            </p>
          </div>
          {latest && (
            <div className="bg-tile flex flex-col justify-between gap-6 rounded-[28px] p-10">
              <div>
                <h2 className="text-accent-text text-sm font-semibold">
                  What's new in {latest.version}
                </h2>
                {latest.summary && (
                  <p className="mt-3 text-[22px] font-semibold tracking-[-0.01em]">
                    {latest.summary}
                  </p>
                )}
                <ul className="text-muted mt-3 space-y-1 text-[17px] leading-normal">
                  {latest.changes.slice(0, 4).map((change) => (
                    <li key={change.title}>{change.title}</li>
                  ))}
                </ul>
              </div>
              <Link href="/changelog/" className="hover:text-accent-text font-semibold">
                See the changelog
              </Link>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
