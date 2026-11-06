import { Text, View } from 'react-native';

import type { ChangelogEntry } from '~/data/Changelog';
import { useSettingsStore } from '~/store/useSettingsStore';
import { cn } from '~/utils/utils';

const formatReleaseDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

export const ChangelogChanges = ({ entry }: { entry: ChangelogEntry }) => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);

  return (
    <View className="gap-y-3">
      {entry.summary && (
        <Text className={cn('text-base', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
          {entry.summary}
        </Text>
      )}
      {entry.changes.map((change) => (
        <View key={change.title} className="flex-row gap-x-3">
          <View className="mt-2 h-1.5 w-1.5 rounded-full bg-ut-burnt-orange" />
          <View className="flex-1">
            <Text
              className={cn(
                'font-semibold text-base',
                isDarkMode ? 'text-gray-100' : 'text-gray-800',
              )}
            >
              {change.title}
            </Text>
            {change.description && (
              <Text className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
                {change.description}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

export const ChangelogEntryCard = ({
  entry,
  isInstalled,
}: {
  entry: ChangelogEntry;
  isInstalled: boolean;
}) => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);

  return (
    <View
      testID={`changelog-entry-${entry.version}`}
      className={cn(
        'gap-y-3 rounded-xl p-4',
        isDarkMode ? 'bg-ut-grey-dark-mode/10' : 'bg-neutral-50',
      )}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-x-2">
          <Text className={cn('font-bold text-xl', isDarkMode ? 'text-white' : 'text-black')}>
            Version {entry.version}
          </Text>
          {isInstalled && (
            <View className="rounded-full bg-ut-burnt-orange/15 px-2 py-0.5">
              <Text className="font-semibold text-ut-burnt-orange text-xs">Installed</Text>
            </View>
          )}
        </View>
        {entry.date && (
          <Text className={cn('text-sm', isDarkMode ? 'text-gray-500' : 'text-gray-400')}>
            {formatReleaseDate(entry.date)}
          </Text>
        )}
      </View>
      <ChangelogChanges entry={entry} />
    </View>
  );
};
