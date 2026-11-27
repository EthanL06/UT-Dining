import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ChangelogEntryCard } from '~/components/changelog/ChangelogEntryView';
import { largeTitleHeaderOptions } from '~/components/TabStack';
import { OverflowScrollView } from '~/components/ui/OverflowScrollView';
import { Text } from '~/components/ui/Text';
import { refreshChangelog, useChangelogStore } from '~/store/useChangelogStore';
import { COLORS } from '~/utils/colors';
import { useTheme } from '~/utils/theme';

const Changelog = () => {
  const theme = useTheme();
  const entries = useChangelogStore((state) => state.entries);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void refreshChangelog().then((loaded) => setStatus(loaded ? 'loaded' : 'failed'));
  }, []);

  const latestVersion = entries[0]?.version;
  const isExpanded = (version: string) => expanded[version] ?? version === latestVersion;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Changelog', ...largeTitleHeaderOptions(theme) }} />
      <OverflowScrollView
        divider={false}
        testID="changelog-list"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 48,
          gap: 10,
        }}
      >
        {entries.map((entry) => (
          <ChangelogEntryCard
            key={entry.version}
            entry={entry}
            isLatest={entry.version === latestVersion}
            expanded={isExpanded(entry.version)}
            onToggle={() =>
              setExpanded((current) => ({
                ...current,
                [entry.version]: !isExpanded(entry.version),
              }))
            }
          />
        ))}
        {entries.length === 0 &&
          (status === 'loading' ? (
            <ActivityIndicator className="py-8" color={COLORS['ut-burnt-orange']} />
          ) : (
            <Text variant="callout" tone="secondary" className="py-8 text-center">
              {status === 'failed'
                ? "Couldn't load the changelog. Check your connection and try again."
                : 'No release notes yet.'}
            </Text>
          ))}
      </OverflowScrollView>
    </View>
  );
};

export default Changelog;
