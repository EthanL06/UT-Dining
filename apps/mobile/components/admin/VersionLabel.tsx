import * as Application from 'expo-application';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { Text } from '~/components/ui/Text';
import { useAdminSignIn } from '~/hooks/useAdmin';
import { checkAdminAccess } from '~/services/admin/session';
import { haptics } from '~/utils/haptics';
import { log } from '~/utils/log';

const LONG_PRESS_MS = 2000;

export const VersionLabel = () => {
  const signIn = useAdminSignIn();

  const open = async () => {
    try {
      const current = await checkAdminAccess();
      const access = current.status === 'admin' ? current : await signIn.mutateAsync();
      if (access.status === 'admin') {
        haptics.success();
        router.push('/settings/admin');
      }
    } catch (error) {
      log.warn(`Admin sign-in failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <Pressable
      testID="settings-version"
      accessible={false}
      delayLongPress={LONG_PRESS_MS}
      disabled={signIn.isPending}
      onLongPress={() => void open()}
    >
      <Text variant="footnote" tone="secondary">
        Version {Application.nativeApplicationVersion}
      </Text>
    </Pressable>
  );
};
