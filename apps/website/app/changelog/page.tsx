import type { Metadata } from 'next';
import { ChangelogList } from '@/components/ChangelogList';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { changelogSource, getChangelog } from '@/lib/changelog';

export const metadata: Metadata = {
  title: 'Changelog · UT Dining',
  description: 'Every update to UT Dining, newest first.',
};

export default async function ChangelogPage() {
  const entries = await getChangelog();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-290 px-6 pt-16 pb-10">
        <h1 className="font-bold text-[clamp(40px,6vw,64px)] leading-none tracking-[-0.04em]">
          Changelog
        </h1>
        <p className="mt-4 text-[19px] text-muted">Every update to UT Dining, newest first.</p>
      </section>

      <ChangelogList initial={entries} source={changelogSource()} />

      <SiteFooter />
    </div>
  );
}
