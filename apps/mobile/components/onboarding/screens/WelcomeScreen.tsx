import { Image } from 'expo-image';
import { Heart, type LucideIcon, Map as MapIcon, Utensils } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { useTheme } from '~/utils/theme';

const icon = require('~/assets/onboarding/icon.webp');

const FEATURES: { Icon: LucideIcon; title: string; subtitle: string }[] = [
  {
    Icon: Utensils,
    title: 'Browse menus with ease',
    subtitle: "Know what's on the menu at every dining hall before you go.",
  },
  {
    Icon: MapIcon,
    title: 'Find food near you',
    subtitle: 'Every spot on campus on one map, with hours and walking times.',
  },
  {
    Icon: Heart,
    title: 'Save and plan',
    subtitle: 'Keep your favorites and plan your meals for the day.',
  },
];

const WelcomeScreen = ({ width }: { width: number }) => {
  const theme = useTheme();

  return (
    <View style={{ width, backgroundColor: theme.background }} className="flex-1 px-8 pt-6">
      <View className="flex-1 justify-center">
        <Image
          source={icon}
          style={{ width: 88, height: 88, alignSelf: 'center', borderRadius: 20 }}
          contentFit="contain"
        />
        <Text
          testID="onboarding-welcome-title"
          className="mt-5 mb-10 text-center font-bold text-[34px] leading-[40px]"
          style={{ color: theme.label }}
        >
          Welcome to{'\n'}
          <Text style={{ color: theme.tint }}>UT Dining</Text>
        </Text>
        <View className="gap-y-7">
          {FEATURES.map(({ Icon, title, subtitle }) => (
            <View key={title} className="flex-row items-start gap-x-4">
              <View className="w-11 items-center pt-0.5">
                <Icon size={30} color={theme.tint} />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-[17px]" style={{ color: theme.label }}>
                  {title}
                </Text>
                <Text className="text-[15px] leading-5" style={{ color: theme.secondaryLabel }}>
                  {subtitle}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default WelcomeScreen;
