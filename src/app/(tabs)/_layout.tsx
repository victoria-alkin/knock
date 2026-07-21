import { BlurView } from 'expo-blur';
import { Tabs, useRouter } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { tabIcons } from '@/constants/icons';

// Frosted "liquid glass" backdrop for the tab bar — content scrolls behind it.
function GlassTabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        tint="light"
        intensity={Platform.OS === 'android' ? 24 : 60}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glassOverlay} />
    </View>
  );
}

function CreateButton() {
  const router = useRouter();
  return (
    <PressableScale
      outerStyle={styles.createButton}
      onPress={() => router.push('/create-post')}
      scaleTo={0.88}
      accessibilityLabel="New post"
    >
      <View style={styles.createCircle}>
        <Icon source={tabIcons.plus} size={24} color="#FFFFFF" />
      </View>
    </PressableScale>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6D28D9',
        tabBarInactiveTintColor: '#9B8CAF',
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => <GlassTabBarBackground />,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Icon source={tabIcons.home} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="channels"
        options={{
          title: 'Channels',
          tabBarIcon: ({ color }) => (
            <Icon source={tabIcons.channels} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarButton: () => <CreateButton />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => (
            <Icon source={tabIcons.messages} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Icon source={tabIcons.profile} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(109, 40, 217, 0.15)',
    elevation: 0,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  createButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D28D9',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  createPlus: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 34,
  },
});
