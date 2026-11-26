import Link from 'next/link';
import { Phone } from '@/components/Phone';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getChangelog } from '@/lib/changelog';
import { APP_STORE_URL } from '@/lib/site';

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
        className={
          tile.layout === 'below'
            ? '-translate-x-1/2 absolute top-34 left-1/2 w-55'
            : big
              ? '-translate-x-1/2 absolute top-40 left-1/2 w-60 md:top-24 md:left-[66%] md:w-75'
              : '-translate-x-1/2 absolute top-34 left-1/2 w-55 md:top-9 md:left-[72%]'
        }
      />
    </article>
  );
}

export default async function Home() {
  const [latest] = await getChangelog();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-290 px-6 pt-16 pb-14 md:pt-18">
        <h1 className="max-w-225 font-bold text-[clamp(44px,8vw,80px)] leading-[0.98] tracking-[-0.045em]">
          Hungry? Here's everything open on campus.
        </h1>
        <div className="mt-7 flex flex-wrap items-end justify-between gap-6">
          <p className="max-w-120 text-[19px] text-muted leading-normal">
            UT Dining shows every menu, hour and allergen at UT Austin in one fast, free iPhone app.
          </p>
          <a
            href={APP_STORE_URL}
            className="rounded-2xl bg-strong px-6 py-4 font-semibold text-on-strong hover:opacity-90"
          >
            Download on the App Store
          </a>
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
        <div className="rounded-[28px] bg-tile p-10">
          <h2 className="font-semibold text-accent-text text-sm">Why it exists</h2>
          <p className="mt-3 text-[22px] leading-[1.45] tracking-[-0.01em]">
            The official menus are hard to read on a phone and never say what's open. UT Dining puts
            every menu and every hour in one app that opens instantly, even on bad campus Wi-Fi.
            It's built by a Longhorn, not the university.
          </p>
        </div>
        {latest && (
          <div className="flex flex-col justify-between gap-6 rounded-[28px] bg-tile p-10">
            <div>
              <h2 className="font-semibold text-accent-text text-sm">
                What's new in {latest.version}
              </h2>
              {latest.summary && (
                <p className="mt-3 font-semibold text-[22px] tracking-[-0.01em]">
                  {latest.summary}
                </p>
              )}
              <ul className="mt-3 space-y-1 text-[17px] text-muted leading-normal">
                {latest.changes.slice(0, 4).map((change) => (
                  <li key={change.title}>{change.title}</li>
                ))}
              </ul>
            </div>
            <Link href="/changelog/" className="font-semibold hover:text-accent-text">
              See the changelog
            </Link>
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
