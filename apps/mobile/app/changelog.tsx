import * as Application from 'expo-application';
import { Stack } from 'expo-router';
import { History } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Container } from '~/components/Container';
import { ChangelogEntryCard } from '~/components/changelog/ChangelogEntryView';
import TopBar from '~/components/TopBar';
import { refreshChangelog, useChangelogStore } from '~/store/useChangelogStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { COLORS } from '~/utils/colors';
import { cn } from '~/utils/utils';

const Changelog = () => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const installedVersion = Application.nativeApplicationVersion;
  const entries = useChangelogStore((state) => state.entries);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');

  useEffect(() => {
    refreshChangelog().then((loaded) => setStatus(loaded ? 'loaded' : 'failed'));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#171717' : '#fff' }}>
      <Stack.Screen options={{ title: 'Changelog', headerShown: false }} />
      <Container className="mx-0 gap-y-0" disableBottomPadding>
        <View className="mt-2 flex gap-y-4 px-6">
          <TopBar variant="back" />
          <View>
            <View className="flex-row items-center gap-x-2">
              <Text
                className={cn('font-extrabold text-3xl', isDarkMode ? 'text-white' : 'text-black')}
              >
                Changelog
              </Text>
              <History size={20} color={COLORS['ut-burnt-orange']} />
            </View>
            <Text className={cn('font-medium', isDarkMode ? 'text-gray-300' : 'text-ut-grey')}>
              Everything new in UT Dining, one update at a time.
            </Text>
          </View>
          <View
            className={cn(
              'w-full border-b',
              isDarkMode ? 'border-neutral-800' : 'border-ut-grey/15',
            )}
          />
        </View>
        <ScrollView
          testID="changelog-list"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 64,
            gap: 16,
          }}
        >
          {entries.map((entry) => (
            <ChangelogEntryCard
              key={entry.version}
              entry={entry}
              isInstalled={entry.version === installedVersion}
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
      </Container>
    </View>
  );
};

export default Changelog;
