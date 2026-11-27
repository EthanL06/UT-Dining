export const resolveVisibleSince = (
  stored: number | undefined,
  isExistingUser: boolean,
  now: number,
): number => stored ?? (isExistingUser ? 0 : now);

export const isNotificationVisible = (sentAt: string | null, visibleSince: number): boolean => {
  if (visibleSince === 0) return true;
  if (!sentAt) return false;
  const sentTime = new Date(sentAt).getTime();
  return !Number.isNaN(sentTime) && sentTime >= visibleSince;
};
