import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '~/components/ui/Text';
import { useTheme } from '~/utils/theme';

export const AdminLoading = () => {
  const theme = useTheme();
  return (
    <View testID="admin-loading" className="flex-1 items-center justify-center">
      <ActivityIndicator color={theme.secondaryLabel} />
    </View>
  );
};

export const AdminError = ({ onRetry }: { onRetry: () => void }) => {
  const theme = useTheme();
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text variant="headline" className="text-center">
        Couldn't reach the admin tools
      </Text>
      <Text variant="subheadline" tone="secondary" paragraph className="mt-1 text-center">
        Check your connection and try again.
      </Text>
      <Pressable
        onPress={onRetry}
        className="mt-4 rounded-full px-5 py-2.5"
        style={{ backgroundColor: theme.tintSoft }}
      >
        <Text variant="subheadline" emphasized tone="tint">
          Try Again
        </Text>
      </Pressable>
    </View>
  );
};
