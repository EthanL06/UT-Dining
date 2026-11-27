export type ImageCheck = { kind: 'ok'; url: string | null } | { kind: 'invalid' };

export const checkImageUrl = (text: string): ImageCheck => {
  const url = text.trim();
  if (!url) return { kind: 'ok', url: null };
  if (!/^https:\/\/[^\s/]+\.[^\s]+$/.test(url)) return { kind: 'invalid' };
  return { kind: 'ok', url };
};
