'use client';

import { useEffect, useState } from 'react';
import { ChangelogIcon } from '@/components/ChangelogIcon';
import {
  type ChangelogEntry,
  type ChangelogSource,
  fetchPublished,
  formatReleaseDate,
  sortEntries,
} from '@/lib/changelog';

export function ChangelogList({
  initial,
  source,
}: {
  initial: ChangelogEntry[];
  source: ChangelogSource;
}) {
  const [entries, setEntries] = useState(initial);

  useEffect(() => {
    let active = true;
    fetchPublished(source).then((rows) => {
      if (active && rows) setEntries(sortEntries(rows));
    });
    return () => {
      active = false;
    };
  }, [source]);

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
  );
}
