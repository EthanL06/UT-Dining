import { Linking } from 'react-native';
import { GroupedRow, GroupedSection } from '~/components/ui/Grouped';
import type { ScraperHealth } from '~/services/admin/tools';
import { formatAgo, runLabel } from '~/utils/adminView';

const EVENTS: Record<string, string> = {
  schedule: 'Scheduled',
  workflow_dispatch: 'Manual',
  push: 'After a merge',
};

const LABEL_COLORS = {
  Succeeded: '#2E9E4F',
  Failed: '#E0463F',
} as const;

export const RunsSection = ({ scraper }: { scraper: ScraperHealth }) => {
  switch (scraper.status) {
    case 'unavailable':
      return (
        <GroupedSection header="Recent Runs">
          <GroupedRow
            isFirst
            title="Not set up"
            subtitle="Add the GitHub token to the admin tools to see runs"
            multilineSubtitle
          />
        </GroupedSection>
      );
    case 'ready':
      return (
        <GroupedSection
          header="Recent Runs"
          footer={`Last success ${formatAgo(scraper.lastSuccess?.updatedAt ?? null).toLowerCase()}`}
        >
          {scraper.runs.length === 0 ? (
            <GroupedRow isFirst title="No runs yet" />
          ) : (
            scraper.runs.map((run, index) => {
              const label = runLabel(run);
              return (
                <GroupedRow
                  key={run.id}
                  isFirst={index === 0}
                  title={label}
                  titleColor={
                    label in LABEL_COLORS
                      ? LABEL_COLORS[label as keyof typeof LABEL_COLORS]
                      : undefined
                  }
                  subtitle={`${EVENTS[run.event] ?? run.event} · ${formatAgo(run.startedAt)}`}
                  showChevron={!!run.url}
                  onPress={run.url ? () => void Linking.openURL(run.url) : undefined}
                />
              );
            })
          )}
        </GroupedSection>
      );
  }
};
