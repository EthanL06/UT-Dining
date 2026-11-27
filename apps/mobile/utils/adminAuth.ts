export type AuthRedirect =
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'refused' }
  | { kind: 'invalid' };

const params = (part: string | undefined) => new URLSearchParams(part ?? '');

export const readAuthRedirect = (url: string): AuthRedirect => {
  const [beforeHash, hash] = url.split('#');
  const query = params(beforeHash.split('?')[1]);
  const fragment = params(hash);
  if (query.has('error') || fragment.has('error')) return { kind: 'refused' };
  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');
  if (!accessToken || !refreshToken) return { kind: 'invalid' };
  return { kind: 'tokens', accessToken, refreshToken };
};
