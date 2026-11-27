import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Alert, Share } from 'react-native';
import { GroupedRow, IconSquare } from '~/components/ui/Grouped';
import { Text } from '~/components/ui/Text';
import { useChangelogStore } from '~/store/useChangelogStore';
import { haptics } from '~/utils/haptics';

export const ROW_INSET = 58;

export const COLORS = {
  orange: '#BF5700',
  blue: '#0A84FF',
  green: '#2E9E4F',
  red: '#E0463F',
  purple: '#8E5BD0',
  yellow: '#E3A857',
  gray: '#8E8E93',
  indigo: '#3B3B8F',
};

export type ActionStatus = 'running' | 'done' | 'failed';

export const STATUS_LABELS: Record<ActionStatus, string> = {
  running: 'Working…',
  done: 'Done',
  failed: 'Failed',
};

export const useActionStatus = () => {
  const [statuses, setStatuses] = React.useState<Record<string, ActionStatus>>({});

  const run = React.useCallback(async (key: string, action: () => unknown) => {
    setStatuses((current) => ({ ...current, [key]: 'running' }));
    try {
      await action();
      setStatuses((current) => ({ ...current, [key]: 'done' }));
      haptics.success();
    } catch (error) {
      setStatuses((current) => ({ ...current, [key]: 'failed' }));
      haptics.error();
      Alert.alert('Failed', error instanceof Error ? error.message : String(error));
    }
  }, []);

  const detail = (key: string) => {
    const status = statuses[key];
    return status ? STATUS_LABELS[status] : undefined;
  };

  return { run, detail, isRunning: (key: string) => statuses[key] === 'running' };
};

export const confirm = (title: string, message: string, onConfirm: () => void) =>
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Reset', style: 'destructive', onPress: onConfirm },
  ]);

export const share = (message: string) => {
  Share.share({ message }).catch(() => {});
};

export const ActionRow = ({
  title,
  subtitle,
  Icon,
  color,
  isFirst,
  detail,
  onPress,
  onLongPress,
  testID,
}: {
  title: string;
  subtitle?: string;
  Icon: LucideIcon;
  color: string;
  isFirst?: boolean;
  detail?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  testID?: string;
}) => (
  <GroupedRow
    testID={testID}
    isFirst={isFirst}
    separatorInset={ROW_INSET}
    leading={<IconSquare Icon={Icon} color={color} />}
    title={title}
    subtitle={subtitle}
    detail={detail}
    onPress={onPress}
    onLongPress={onLongPress}
  />
);

export const InfoRow = ({
  label,
  value,
  isFirst,
  valueColor,
  onPress,
  testID,
}: {
  label: string;
  value: string;
  isFirst?: boolean;
  valueColor?: string;
  onPress?: () => void;
  testID?: string;
}) => {
  return (
    <GroupedRow
      testID={testID}
      isFirst={isFirst}
      title={label}
      onPress={onPress}
      trailing={
        <Text
          variant="subheadline"
          numberOfLines={1}
          className="max-w-[60%] text-right"
          tone="secondary"
          color={valueColor}
        >
          {value}
        </Text>
      }
    />
  );
};

export const latestVersion = () => useChangelogStore.getState().entries[0]?.version ?? '1.0.0';
