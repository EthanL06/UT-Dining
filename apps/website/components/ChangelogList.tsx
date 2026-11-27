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
            className="bg-tile grid grid-cols-1 gap-4 rounded-[28px] p-7 md:grid-cols-[200px_minmax(0,1fr)] md:gap-10 md:p-10"
          >
            <div>
              <h2 className="border-line inline-block rounded-full border px-2.5 py-0.5 text-sm font-semibold">
                <span className="sr-only">Version </span>
                {entry.version}
              </h2>
              {date && (
                <p className="text-muted mt-2.5 text-sm">
                  <time dateTime={entry.release_date ?? undefined}>{date}</time>
                </p>
              )}
            </div>
            <div>
              {entry.summary && (
                <p className="mb-4 text-[26px] font-bold tracking-[-0.02em]">{entry.summary}</p>
              )}
              <ul className="flex flex-col gap-4">
                {entry.changes.map((change) => (
                  <li key={change.title} className="flex gap-3.5">
                    <ChangelogIcon icon={change.icon} />
                    <div>
                      <p className="leading-snug font-semibold">{change.title}</p>
                      {change.description && (
                        <p className="text-muted mt-0.5 leading-normal">{change.description}</p>
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
