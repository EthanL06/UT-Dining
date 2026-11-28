import { TriangleAlert, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Reanimated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '~/components/ui/PressableScale';
import { Text } from '~/components/ui/Text';
import { useNow } from '~/hooks/useNow';
import { openStatusPage, useServiceStatus } from '~/hooks/useServiceStatus';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useStatusToastStore } from '~/store/useStatusToastStore';
import { getStatusToast, previewServiceStatus } from '~/utils/serviceStatus';
import { useTheme } from '~/utils/theme';

const TAB_BAR_HEIGHT = 62;
const ACCESSORY_HEIGHT = 56;
const GAP = 12;

const useStatusToast = () => {
  const { data: live } = useServiceStatus();
  const preview = useStatusToastStore((state) => state.preview);
  const lastSyncedAt = useDataSyncStore((state) => state.lastSupabaseQueryTime);
  const now = useNow();
  const status = preview === 'off' ? live : previewServiceStatus(preview);
  return {
    loaded: status !== undefined,
    toast: getStatusToast(status, lastSyncedAt, now.getTime()),
  };
};

export const StatusToast = ({ hasAccessory }: { hasAccessory: boolean }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { loaded, toast } = useStatusToast();
  const dismissed = useStatusToastStore((state) => state.dismissed);
  const dismiss = useStatusToastStore((state) => state.dismiss);
  const clearDismissed = useStatusToastStore((state) => state.clearDismissed);

  useEffect(() => {
    if (loaded && toast === null && dismissed !== null) clearDismissed();
  }, [loaded, toast, dismissed, clearDismissed]);

  if (!toast || dismissed === toast.kind) return null;

  const isDown = toast.health === 'outage';
  const accent = isDown ? theme.danger : theme.warning;
  const accentSoft = isDown ? theme.dangerSoft : theme.warningSoft;
  const bottom = insets.bottom + TAB_BAR_HEIGHT + (hasAccessory ? ACCESSORY_HEIGHT : 0) + GAP;

  return (
    <Reanimated.View
      key={toast.kind}
      entering={FadeInDown.duration(250)}
      exiting={FadeOutDown.duration(200)}
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 16, right: 16, bottom }}
    >
      <View
        testID="status-toast"
        className="flex-row items-center gap-x-3 rounded-[20px] py-3 pr-3 pl-3.5"
        style={{
          backgroundColor: theme.toast,
          borderWidth: 0.5,
          borderColor: theme.toastBorder,
          borderCurve: 'continuous',
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
        }}
      >
        <View
          className="size-[34px] items-center justify-center rounded-full"
          style={{ backgroundColor: accentSoft }}
        >
          <TriangleAlert size={17} color={accent} strokeWidth={2.2} />
        </View>
        <Pressable
          testID="status-toast-open"
          accessibilityRole="button"
          accessibilityHint="Opens the UT Dining status page"
          onPress={openStatusPage}
          className="flex-1"
        >
          <Text variant="subheadline" emphasized color={theme.toastLabel}>
            {toast.title}
          </Text>
          <Text variant="footnote" tone="secondary">
            {toast.detail}
          </Text>
        </Pressable>
        <PressableScale
          testID="status-toast-hide"
          accessibilityRole="button"
          accessibilityLabel="Hide until it changes"
          onPress={() => dismiss(toast.kind)}
          hitSlop={8}
          className="size-7 items-center justify-center rounded-full"
          style={{ backgroundColor: theme.fill }}
        >
          <X size={13} color={theme.secondaryLabel} strokeWidth={3} />
        </PressableScale>
      </View>
    </Reanimated.View>
  );
};
