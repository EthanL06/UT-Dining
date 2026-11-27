import * as WebBrowser from 'expo-web-browser';
import { readAuthRedirect } from '~/utils/adminAuth';
import { isDevVariant } from '~/utils/appVariant';
import { log } from '~/utils/log';
import { adminClient } from './client';

export type AdminAccess = { status: 'admin'; email: string } | { status: 'none' };

const REDIRECT_URL = `${isDevVariant ? 'ut-dining-dev' : 'ut-dining'}://admin-auth`;

export const checkAdminAccess = async (): Promise<AdminAccess> => {
  const { data } = await adminClient.auth.getSession();
  const email = data.session?.user.email;
  if (!email) return { status: 'none' };
  const { data: isAdmin, error } = await adminClient.rpc('is_dashboard_admin');
  if (error) throw new Error(error.message);
  if (isAdmin === true) return { status: 'admin', email };
  await adminClient.auth.signOut({ scope: 'local' });
  return { status: 'none' };
};

export const signInAsAdmin = async (): Promise<AdminAccess> => {
  const { data, error } = await adminClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: REDIRECT_URL,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error || !data.url) throw new Error(error?.message ?? 'No sign-in link');

  const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);
  if (result.type !== 'success') return { status: 'none' };

  const redirect = readAuthRedirect(result.url);
  if (redirect.kind !== 'tokens') {
    log.warn(`Admin sign-in did not finish: ${redirect.kind}`);
    return { status: 'none' };
  }
  const { error: sessionError } = await adminClient.auth.setSession({
    access_token: redirect.accessToken,
    refresh_token: redirect.refreshToken,
  });
  if (sessionError) throw new Error(sessionError.message);
  return checkAdminAccess();
};

export const setLocalAdminSession = async (accessToken: string, refreshToken: string) => {
  const { error } = await adminClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw new Error(error.message);
};

export const signOutAdmin = async () => {
  await adminClient.auth.signOut({ scope: 'local' });
};
