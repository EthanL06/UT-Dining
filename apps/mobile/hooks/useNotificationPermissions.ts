import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { log } from '~/utils/log';

export function useNotificationPermissions() {
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  const checkPermissions = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
    } catch (error) {
      log.error('Error checking notification permissions', error);
      setPermissionStatus(Notifications.PermissionStatus.DENIED);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  useFocusEffect(
    useCallback(() => {
      checkPermissions();
    }, [checkPermissions]),
  );

  const requestPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      return status;
    } catch (error) {
      log.error('Error requesting notification permissions', error);
      return Notifications.PermissionStatus.DENIED;
    }
  };

  return {
    permissionStatus,
    isLoading,
    isGranted: permissionStatus === Notifications.PermissionStatus.GRANTED,
    isDenied: permissionStatus === Notifications.PermissionStatus.DENIED,
    isUndetermined: permissionStatus === Notifications.PermissionStatus.UNDETERMINED,
    requestPermissions,
  };
}
