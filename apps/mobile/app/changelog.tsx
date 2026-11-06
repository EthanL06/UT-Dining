import * as Application from 'expo-application';
import { Stack } from 'expo-router';
import { History } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { Container } from '~/components/Container';
import { ChangelogEntryCard } from '~/components/changelog/ChangelogEntryView';
import TopBar from '~/components/TopBar';
import { CHANGELOG } from '~/data/Changelog';
import { useSettingsStore } from '~/store/useSettingsStore';
import { COLORS } from '~/utils/colors';
import { cn } from '~/utils/utils';

const Changelog = () => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const installedVersion = Application.nativeApplicationVersion;

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#171717' : '#fff' }}>
      <Stack.Screen options={{ title: 'Changelog', headerShown: false }} />
      <Container className="mx-0" disableBottomPadding>
        <View className="mt-6 flex gap-y-5 px-6">
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
        </View>
        <ScrollView
          testID="changelog-list"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 24, paddingBottom: 64, gap: 16 }}
        >
          {CHANGELOG.map((entry) => (
            <ChangelogEntryCard
              key={entry.version}
              entry={entry}
              isInstalled={entry.version === installedVersion}
            />
          ))}
        </ScrollView>
      </Container>
    </View>
  );
};

export default Changelog;
