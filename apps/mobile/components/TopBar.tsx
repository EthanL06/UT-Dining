import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '~/utils/colors';

const TopBar = (_props: { variant?: 'back' }) => (
  <View className="flex w-full flex-row items-center justify-between ">
    <TouchableOpacity
      testID="back-button"
      className="flex flex-row items-center"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
      }}
    >
      <ChevronLeft size={24} color={COLORS['ut-burnt-orange']} />

      <Text className="font-semibold text-lg text-ut-burnt-orange">Back</Text>
    </TouchableOpacity>
  </View>
);

export default TopBar;
