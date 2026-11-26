import type { Metadata } from 'next';
import { ChangelogList } from '@/components/ChangelogList';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getChangelog } from '@/lib/changelog';
import { pageMetadata } from '@/lib/site';

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: 'Changelog',
  description:
    'Every UT Dining update, newest first: new features, fixes and improvements to the UT Austin dining app.',
  path: '/changelog/',
});

export default async function ChangelogPage() {
  const entries = await getChangelog();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="mx-auto max-w-290 px-6 pt-16 pb-10">
          <h1 className="font-bold text-[clamp(40px,6vw,64px)] leading-none tracking-[-0.04em]">
            Changelog
          </h1>
          <p className="mt-4 text-[19px] text-muted">Every update to UT Dining, newest first.</p>
        </section>

        <ChangelogList entries={entries} />
      </main>

      <SiteFooter />
    </div>
  );
}
