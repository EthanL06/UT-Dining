import LottieView from 'lottie-react-native';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Text } from '~/components/ui/Text';

import { useTheme } from '~/utils/theme';

type Props = {
  width: number;
  handleComplete: () => void;
  isCurrentScreen: boolean;
};

const CompleteScreen = ({ width, isCurrentScreen }: Props) => {
  const theme = useTheme();
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (!isCurrentScreen) {
      lottieRef.current?.reset();
    }
  }, [isCurrentScreen]);

  return (
    <View
      style={{ width, backgroundColor: theme.background }}
      className="flex-1 items-center justify-center px-8"
    >
      <LottieView
        ref={lottieRef}
        source={require('~/assets/onboarding/success-lottie.json')}
        autoPlay={isCurrentScreen}
        loop
        style={{ width: 300, height: 300 }}
        resizeMode="cover"
      />
      <Text variant="title1" style={{ marginTop: -48 }} className="text-center">
        You're all set 🤘
      </Text>
      <Text paragraph tone="secondary" className="mx-auto mt-2 max-w-[300px] text-center">
        Thanks for setting things up. Now it's time to find your next meal.
      </Text>
    </View>
  );
};

export default CompleteScreen;
