import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// How notifications behave while the app is open in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Register this device for push and store its Expo push token against the
 * signed-in user. Safe to call anywhere: it quietly no-ops when push can't work
 * (Expo Go, simulators, or before EAS is configured) and never throws.
 */
export async function registerForPushNotificationsAsync(): Promise<void> {
  try {
    // Expo Go can't receive remote push on SDK 53+, and simulators have no
    // push token. A development build is required; until then, skip silently.
    if (Constants.appOwnership === 'expo') return;
    if (!Device.isDevice) return;

    // getExpoPushTokenAsync needs the EAS project id. It won't exist until the
    // project is set up with EAS, so treat its absence as "not ready yet".
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Constants as any).easConfig?.projectId;
    if (!projectId) return;

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !token) return;

    // Owner-scoped per RLS; one row per device token.
    await supabase.from('push_tokens').upsert(
      {
        token,
        user_id: user.id,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );
  } catch {
    // Push is best-effort; never let registration crash the app.
  }
}
