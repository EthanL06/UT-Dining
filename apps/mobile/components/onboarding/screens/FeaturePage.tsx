import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { useSettingsStore } from '~/store/useSettingsStore';
import { useTheme } from '~/utils/theme';

type Props = {
  width: number;
  title: string;
  subtitle: string;
  images: { light: number; dark: number }[];
};

const FeaturePage = ({ width, title, subtitle, images }: Props) => {
  const theme = useTheme();
  const isDark = useSettingsStore((state) => state.isDarkMode);

  return (
    <View style={{ width, backgroundColor: theme.background }} className="flex-1 px-6 pt-4 pb-6">
      <View className="flex-1 flex-row justify-center gap-x-3" style={{ minHeight: 0 }}>
        {images.map((image) => (
          <Image
            key={image.light}
            source={isDark ? image.dark : image.light}
            style={{ flex: 1, maxWidth: images.length === 1 ? 300 : 200 }}
            contentFit="contain"
          />
        ))}
      </View>
      <View className="mt-6">
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
    </View>
  );
};

export default FeaturePage;
