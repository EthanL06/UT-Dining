import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { log } from '~/utils/log';

export type PermissionKind = 'location' | 'notifications';

export type PermissionState = 'checking' | 'undetermined' | 'granted' | 'denied';

type PermissionResponse = { status: string };

const PERMISSIONS: Record<
  PermissionKind,
  { check: () => Promise<PermissionResponse>; request: () => Promise<PermissionResponse> }
> = {
  location: {
    check: Location.getForegroundPermissionsAsync,
    request: Location.requestForegroundPermissionsAsync,
  },
  notifications: {
    check: Notifications.getPermissionsAsync,
    request: Notifications.requestPermissionsAsync,
  },
};

const toState = ({ status }: PermissionResponse): PermissionState =>
  status === 'granted' ? 'granted' : status === 'undetermined' ? 'undetermined' : 'denied';

export function usePermission(kind: PermissionKind) {
  const [state, setState] = useState<PermissionState>('checking');

  const refresh = useCallback(async () => {
    try {
      setState(toState(await PERMISSIONS[kind].check()));
    } catch (error) {
      log.error(`Error checking ${kind} permission`, error);
      setState('denied');
    }
  }, [kind]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const request = useCallback(async () => {
    try {
      const next = toState(await PERMISSIONS[kind].request());
      setState(next);
      return next;
    } catch (error) {
      log.error(`Error requesting ${kind} permission`, error);
      return 'denied' as const;
    }
  }, [kind]);

  return { state, request };
}
