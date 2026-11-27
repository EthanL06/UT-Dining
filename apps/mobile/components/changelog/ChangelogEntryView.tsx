import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { LayoutAnimation, TouchableOpacity, View } from 'react-native';
import { Text } from '~/components/ui/Text';
import type { ChangelogChange, ChangelogEntry } from '~/services/changelog/types';
import { useSettingsStore } from '~/store/useSettingsStore';
import { cn } from '~/utils/utils';
import { ChangelogIconTile } from './ChangelogIcon';

const parseDate = (date: string) => new Date(`${date}T12:00:00`);

const formatMonthYear = (date: string) =>
  parseDate(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

const formatShortDate = (date: string) =>
  parseDate(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

export const entryTitle = (entry: ChangelogEntry) =>
  entry.summary ?? entry.changes[0]?.title ?? `Version ${entry.version}`;

export const VersionBadge = ({ version, isLatest }: { version: string; isLatest: boolean }) => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);

  return (
    <View
      className={cn(
        'rounded-md px-[7px] py-[3px]',
        isLatest ? 'bg-ut-burnt-orange' : isDarkMode ? 'bg-neutral-700' : 'bg-[#EDEBE8]',
      )}
    >
      <Text
        variant="caption"
        emphasized
        color={isLatest ? '#FFFFFF' : isDarkMode ? '#E5E7EB' : '#3A3F48'}
      >
        {version}
      </Text>
    </View>
  );
};

export const ChangelogChangeRow = ({
  change,
  compact = false,
}: {
  change: ChangelogChange;
  compact?: boolean;
}) => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);

  return (
    <View className={cn('flex-row gap-x-3', compact ? 'items-center' : 'items-start')}>
      <ChangelogIconTile icon={change.icon} size={compact ? 'sm' : 'md'} />
      <View className="flex-1 gap-y-px">
        <Text
          variant={compact ? 'subheadline' : 'callout'}
          emphasized
          color={isDarkMode ? '#FFFFFF' : '#111111'}
        >
          {change.title}
        </Text>
        {!compact && change.description && (
          <Text variant="subheadline" paragraph color={isDarkMode ? '#9CA3AF' : '#5B6270'}>
            {change.description}
          </Text>
        )}
      </View>
    </View>
  );
};

export const ChangelogEntryCard = ({
  entry,
  isLatest,
  expanded,
  onToggle,
}: {
  entry: ChangelogEntry;
  isLatest: boolean;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const chevronColor = isDarkMode ? '#9CA3AF' : '#8A8F98';

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  if (!expanded) {
    return (
      <TouchableOpacity
        testID={`changelog-entry-${entry.version}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: false }}
        activeOpacity={0.7}
        onPress={toggle}
        className={cn(
          'min-h-14 flex-row items-center gap-x-2.5 rounded-[14px] px-4 py-3',
          isDarkMode ? 'bg-[#1C1C1E]' : 'bg-white',
        )}
      >
        <VersionBadge version={entry.version} isLatest={isLatest} />
        <Text
          variant="subheadline"
          emphasized
          numberOfLines={1}
          color={isDarkMode ? '#FFFFFF' : '#111111'}
          className="flex-1"
        >
          {entryTitle(entry)}
        </Text>
        {entry.date && (
          <Text variant="footnote" color={isDarkMode ? '#9CA3AF' : '#6B7280'}>
            {formatShortDate(entry.date)}
          </Text>
        )}
        <ChevronDown size={16} color={chevronColor} strokeWidth={2.4} />
      </TouchableOpacity>
    );
  }

  return (
    <View
      testID={`changelog-entry-${entry.version}`}
      className={cn('gap-y-3.5 rounded-[18px] p-[18px]', isDarkMode ? 'bg-[#1C1C1E]' : 'bg-white')}
      style={{
        shadowColor: '#000',
        shadowOpacity: isDarkMode ? 0 : 0.05,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
      }}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: true }}
        activeOpacity={0.7}
        onPress={toggle}
        className="flex-row items-center gap-x-2"
      >
        <VersionBadge version={entry.version} isLatest={isLatest} />
        {entry.date && (
          <Text variant="eyebrow" color={isDarkMode ? '#9CA3AF' : '#5B6270'}>
            {formatMonthYear(entry.date)}
          </Text>
        )}
        <View className="ml-auto">
          <ChevronUp size={18} color={chevronColor} strokeWidth={2.4} />
        </View>
      </TouchableOpacity>
      {entry.summary && (
        <Text variant="title3" color={isDarkMode ? '#FFFFFF' : '#111111'}>
          {entry.summary}
        </Text>
      )}
      {entry.changes.map((change) => (
        <ChangelogChangeRow key={change.title} change={change} />
      ))}
    </View>
  );
};
