import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChangelogEntryCard } from '~/components/changelog/ChangelogEntryView';
import TopBar from '~/components/TopBar';
import { refreshChangelog, useChangelogStore } from '~/store/useChangelogStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { COLORS } from '~/utils/colors';
import { cn } from '~/utils/utils';

const Changelog = () => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const insets = useSafeAreaInsets();
  const entries = useChangelogStore((state) => state.entries);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    refreshChangelog().then((loaded) => setStatus(loaded ? 'loaded' : 'failed'));
  }, []);

  const latestVersion = entries[0]?.version;
  const isExpanded = (version: string) => expanded[version] ?? version === latestVersion;

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#171717' : '#F7F6F4' }}>
      <Stack.Screen options={{ title: 'Changelog', headerShown: false }} />
      <View
        style={{ paddingTop: insets.top + 8 }}
        className={cn(
          'gap-y-3 border-b px-6 pb-3.5',
          isDarkMode ? 'border-neutral-800 bg-neutral-900' : 'border-[#ECECEC] bg-white',
        )}
      >
        <TopBar variant="back" />
        <Text
          className={cn(
            'font-extrabold text-[32px] tracking-[-0.5px]',
            isDarkMode ? 'text-white' : 'text-[#111111]',
          )}
        >
          Changelog
        </Text>
      </View>
      <ScrollView
        testID="changelog-list"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 48,
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
            <Text
              className={cn(
                'py-8 text-center text-base',
                isDarkMode ? 'text-gray-400' : 'text-gray-500',
              )}
            >
              {status === 'failed'
                ? "Couldn't load the changelog. Check your connection and try again."
                : 'No release notes yet.'}
            </Text>
          ))}
      </ScrollView>
    </View>
  );
};

export default Changelog;
