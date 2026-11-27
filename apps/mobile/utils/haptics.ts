import * as Haptics from 'expo-haptics';

const play = (feedback: () => Promise<void>) => {
  feedback().catch(() => undefined);
};

export const haptics = {
  selection: () => play(() => Haptics.selectionAsync()),
  tap: () => play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  remove: () => play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
