import { ChangelogIcon } from '@/components/ChangelogIcon';
import { type ChangelogEntry, formatReleaseDate } from '@/lib/changelog';

export function ChangelogList({ entries }: { entries: ChangelogEntry[] }) {
  return (
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
              <h2 className="inline-block rounded-full border border-line px-2.5 py-0.5 font-semibold text-sm">
                <span className="sr-only">Version </span>
                {entry.version}
              </h2>
              {date && (
                <p className="mt-2.5 text-muted text-sm">
                  <time dateTime={entry.release_date ?? undefined}>{date}</time>
                </p>
              )}
            </div>
            <div>
              {entry.summary && (
                <p className="mb-4 font-bold text-[26px] tracking-[-0.02em]">{entry.summary}</p>
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
  );
}
