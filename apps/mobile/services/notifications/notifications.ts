import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { type Href, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useDatabase } from '~/hooks/useDatabase';
import { getOrCreateDeviceId } from '~/services/device/deviceId';
import {
  muteNearbyZone,
  NEARBY_MUTE_ACTION,
  NEARBY_NOTIFICATION_TYPE,
} from '~/services/nearby/nearbyAlerts';
import { useOnboardingStore } from '~/store/useOnboardingStore';
import { usePushNotificationsStore } from '~/store/usePushNotificationsStore';
import { log } from '~/utils/log';
import { supabase } from '~/utils/supabase';
import { type DrizzleDB, insertNotification } from '../database/database';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldShowAlert: true,
  }),
});

const saveNotification = async (db: DrizzleDB, notification: Notifications.Notification) => {
  const { content, identifier } = notification.request;
  if (content.data?.type === NEARBY_NOTIFICATION_TYPE) return;
  try {
    await insertNotification(db, {
      id: identifier,
      title: content.title ?? 'Notification',
      body: content.body ?? '',
      sent_at: new Date().toISOString(),
      redirect_url: content.data?.redirect_url as string | undefined,
      type: content.data?.type as string | undefined,
    });
  } catch (error) {
    log.error('Error saving notification to database', error);
  }
};

const syncPushToken = async (deviceId: string, token: string) => {
  const { data } = await supabase
    .from('user_devices')
    .select('push_token')
    .eq('device_id', deviceId)
    .single();

  if (data?.push_token === token) {
    log.debug('Push token already synced.');
    return;
  }

  const row = { device_id: deviceId, push_token: token, updated_at: new Date().toISOString() };
  const { error } = data
    ? await supabase.from('user_devices').upsert(row)
    : await supabase.from('user_devices').insert(row);
  if (error) log.error('Error saving push token', error);
  else log.debug('Push token saved', { token });
};

export function PushNotificationsInitializer() {
  const setDeviceId = usePushNotificationsStore((s) => s.setDeviceId);
  const setExpoPushToken = usePushNotificationsStore((s) => s.setExpoPushToken);
  const setNotification = usePushNotificationsStore((s) => s.setNotification);
  const isOnboardingComplete = useOnboardingStore((s) => s.isOnboardingComplete);
  const db = useDatabase();
  const registration = useRef<'idle' | 'registering' | 'registered'>('idle');
  const handledResponses = useRef(new Set<string>());

  useEffect(() => {
    const deviceId = getOrCreateDeviceId();
    setDeviceId(deviceId);

    const register = async () => {
      if (registration.current !== 'idle') return;
      registration.current = 'registering';
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        if (!Device.isDevice) {
          log.debug('Must use physical device for push notifications.');
          registration.current = 'registered';
          return;
        }

        let { status } = await Notifications.getPermissionsAsync();
        if (status === 'undetermined' && isOnboardingComplete) {
          status = (await Notifications.requestPermissionsAsync()).status;
        }
        if (status !== 'granted') {
          registration.current = 'idle';
          return;
        }

        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          log.warn('Push notifications need an EAS project ID.');
          registration.current = 'registered';
          return;
        }

        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        setExpoPushToken(token);
        await syncPushToken(deviceId, token);
        registration.current = 'registered';
      } catch (error) {
        log.warn('Push notification registration failed', { error });
        registration.current = 'idle';
      }
    };

    void register();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void register();
    });
    return () => appState.remove();
  }, [isOnboardingComplete, setDeviceId, setExpoPushToken]);

  useEffect(() => {
    const openResponse = async (response: Notifications.NotificationResponse) => {
      const { notification } = response;
      const id = notification.request.identifier;
      if (handledResponses.current.has(id)) return;
      handledResponses.current.add(id);
      Notifications.clearLastNotificationResponse();
      const nearbyZone = notification.request.content.data?.zone;
      if (response.actionIdentifier === NEARBY_MUTE_ACTION && typeof nearbyZone === 'string') {
        muteNearbyZone(nearbyZone);
        return;
      }
      setNotification(notification);
      if (db) await saveNotification(db, notification);
      const redirectUrl = notification.request.content.data?.redirect_url as Href | undefined;
      router.push(redirectUrl ?? '/notifications');
    };

    const launchResponse = Notifications.getLastNotificationResponse();
    if (launchResponse) void openResponse(launchResponse);

    const received = Notifications.addNotificationReceivedListener((notification) => {
      log.debug('Notification foreground received', { notification });
      setNotification(notification);
      if (db) void saveNotification(db, notification);
    });
    const responses = Notifications.addNotificationResponseReceivedListener((response) => {
      void openResponse(response);
    });

    return () => {
      received.remove();
      responses.remove();
    };
  }, [setNotification, db]);

  return null;
}
