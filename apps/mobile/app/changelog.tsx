import { router, Stack } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChangelogEntryCard } from '~/components/changelog/ChangelogEntryView';
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
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#000000' : '#F2F2F7' }}>
      <Stack.Screen options={{ title: 'Changelog', headerShown: false }} />
      <View style={{ paddingTop: insets.top }}>
        <View className="px-4 pt-2">
          <Pressable
            testID="back-button"
            accessibilityLabel="Back"
            accessibilityRole="button"
            onPress={() => router.back()}
            className="size-11 items-center justify-center rounded-full"
            style={{ backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' }}
          >
            <ChevronLeft size={22} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </Pressable>
        </View>
        <Text
          testID="changelog-title"
          className={cn(
            'px-5 pt-3 pb-1 font-bold text-[34px]',
            isDarkMode ? 'text-white' : 'text-black',
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
