import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { openStatusPage, useServiceStatus } from '~/hooks/useServiceStatus';
import { getServiceStatusBanner, SERVICE_STATUS_COLORS } from '~/utils/serviceStatus';
import { useTheme } from '~/utils/theme';

export const ServiceStatusBanner = () => {
  const theme = useTheme();
  const { data: status } = useServiceStatus();
  const banner = getServiceStatusBanner(status);
  if (!status || !banner) return null;

  return (
    <View
      className="mx-4 mb-3 overflow-hidden"
      style={{ backgroundColor: theme.card, borderRadius: 22, borderCurve: 'continuous' }}
    >
      <Pressable
        testID="home-service-status"
        accessibilityRole="button"
        accessibilityHint="Opens the UT Dining status page"
        onPress={openStatusPage}
      >
        {({ pressed }) => (
          <View
            className="flex-row items-center gap-x-3 px-4 py-3.5"
            style={{ backgroundColor: pressed ? theme.fill : 'transparent' }}
          >
            <View
              className="size-2.5 rounded-full"
              style={{ backgroundColor: SERVICE_STATUS_COLORS[status.health] }}
            />
            <View className="flex-1">
              <Text className="text-[15px] font-semibold" style={{ color: theme.label }}>
                {banner.title}
              </Text>
              <Text className="text-[13px]" style={{ color: theme.secondaryLabel }}>
                {banner.detail}
              </Text>
            </View>
            <ChevronRight size={17} color={theme.tertiaryLabel} />
          </View>
        )}
      </Pressable>
    </View>
  );
};
