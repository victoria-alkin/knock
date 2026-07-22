import { Tabs } from 'expo-router';
import { useEffect } from 'react';

import { GlassTabBar } from '@/components/glass-tab-bar';
import { registerForPushNotificationsAsync } from '@/lib/push';

export default function TabsLayout() {
  useEffect(() => {
    // Best-effort; no-ops in Expo Go / before EAS is set up.
    registerForPushNotificationsAsync();
  }, []);

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="channels" options={{ title: 'Channels' }} />
      <Tabs.Screen name="create" options={{ title: '' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
