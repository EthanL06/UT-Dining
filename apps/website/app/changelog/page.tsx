import type { Metadata } from 'next';
import { ChangelogIcon } from '@/components/ChangelogIcon';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { formatReleaseDate, getChangelog } from '@/lib/changelog';

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

      <section className="mx-auto flex max-w-290 flex-col gap-4 px-6">
        {entries.map((entry) => {
          const date = formatReleaseDate(entry.release_date);
          return (
            <article
              key={entry.version}
              id={`v${entry.version}`}
              className="grid grid-cols-1 gap-4 rounded-[28px] bg-tile p-7 md:grid-cols-[200px_minmax(0,1fr)] md:gap-10 md:p-10"
            >
              <div>
                <span className="inline-block rounded-full border border-line px-2.5 py-0.5 font-semibold text-sm">
                  {entry.version}
                </span>
                {date && <p className="mt-2.5 text-muted text-sm">{date}</p>}
              </div>
              <div>
                {entry.summary && (
                  <h2 className="mb-4 font-bold text-[26px] tracking-[-0.02em]">{entry.summary}</h2>
                )}
                <ul className="flex flex-col gap-4">
                  {entry.changes.map((change) => (
                    <li key={change.title} className="flex gap-3.5">
                      <ChangelogIcon icon={change.icon} />
                      <div>
                        <p className="font-semibold leading-snug">{change.title}</p>
                        {change.description && (
                          <p className="mt-0.5 text-muted leading-normal">{change.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </section>

      <SiteFooter />
    </div>
  );
}
