import { Text, View } from 'react-native';

import { useTheme } from '~/utils/theme';

const OnboardingHeader = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const theme = useTheme();

  return (
    <View className="mb-6 px-8">
      <Text
        className="text-center font-bold text-[28px] leading-[33px]"
        style={{ color: theme.label }}
      >
        {title}
      </Text>
      <Text
        className="mx-auto mt-2 max-w-[320px] text-center text-[17px] leading-[23px]"
        style={{ color: theme.secondaryLabel }}
      >
        {subtitle}
      </Text>
    </View>
  );
};

export default OnboardingHeader;
