import { Stack } from 'expo-router';
import { Wrench } from 'lucide-react-native';
import { View } from 'react-native';
import { BuildInfoSection } from '~/components/qa/BuildInfoSection';
import { DataSection } from '~/components/qa/DataSection';
import { LoadingSection } from '~/components/qa/LoadingSection';
import { NearbySection } from '~/components/qa/NearbySection';
import { PromptsSection } from '~/components/qa/PromptsSection';
import { PushSection } from '~/components/qa/PushSection';
import { UpdatesSection } from '~/components/qa/UpdatesSection';
import { OverflowScrollView } from '~/components/ui/OverflowScrollView';
import { Text } from '~/components/ui/Text';
import { useTheme } from '~/utils/theme';

const QAScreen = () => {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'QA Menu', headerLargeTitle: false }} />
      <OverflowScrollView
        divider={false}
        testID="qa-screen"
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
      >
        <View
          className="mx-4 mb-5 flex-row items-center gap-x-3 rounded-[20px] px-4 py-3"
          style={{ backgroundColor: theme.tintSoft }}
        >
          <Wrench size={18} color={theme.tint} />
          <Text variant="subheadline" paragraph className="flex-1">
            Only in UT Dining (Dev). These tools change data on this phone only.
          </Text>
        </View>
        <PromptsSection />
        <DataSection />
        <LoadingSection />
        <PushSection />
        <NearbySection />
        <UpdatesSection />
        <BuildInfoSection />
      </OverflowScrollView>
    </>
  );
};

export default QAScreen;
