import { View } from 'react-native';
import { Text } from '~/components/ui/Text';

const OnboardingHeader = ({ title, subtitle }: { title: string; subtitle: string }) => {
  return (
    <View className="mb-6 px-8">
      <Text variant="title1" className="text-center">
        {title}
      </Text>
      <Text paragraph tone="secondary" className="mx-auto mt-2 max-w-[320px] text-center">
        {subtitle}
      </Text>
    </View>
  );
};

export default OnboardingHeader;
