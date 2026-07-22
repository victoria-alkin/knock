import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { tabIcons, tabIconsFilled } from '@/constants/icons';
import { getUnreadDmCount } from '@/lib/dms';
import { getUnreadCount } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { setTabBarCompact, tabBarCompact } from '@/lib/tab-bar-compact';
import {
  getUnreadDmCountValue,
  setUnreadDmCount,
  subscribeUnreadDms,
} from '@/lib/unread-dms';
import { setUnreadNotifications } from '@/lib/unread-notifications';

// Slot order across the bar. "create" is the raised center button, not a tab.
const SLOTS = ['home', 'channels', 'create', 'messages', 'profile'] as const;
type SlotName = (typeof SLOTS)[number];

const TAB_ICON: Record<Exclude<SlotName, 'create'>, number> = {
  home: tabIcons.home,
  channels: tabIcons.channels,
  messages: tabIcons.messages,
  profile: tabIcons.profile,
};

const TAB_LABEL: Record<Exclude<SlotName, 'create'>, string> = {
  home: 'Home',
  channels: 'Channels',
  messages: 'Messages',
  profile: 'Profile',
};

const BUBBLE = 40;
const ROW_PAD = 6;
const CHARCOAL = '#2C2340';
const PURPLE = '#6D28D9';

export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [rowWidth, setRowWidth] = useState(0);

  const translateX = useRef(new Animated.Value(0)).current;
  const scaleX = useRef(new Animated.Value(1)).current;

  const focusedName = state.routes[state.index]?.name as SlotName | undefined;
  const activeSlot = focusedName ? SLOTS.indexOf(focusedName) : -1;
  const slotWidth =
    rowWidth > 0 ? (rowWidth - ROW_PAD * 2) / SLOTS.length : 0;

  const lastActiveSlot = useRef(activeSlot);

  // Slide the active bubble to the focused tab, stretching into a pill on the
  // way and settling back to a circle. On a bar resize (same tab), just
  // reposition instantly — no slide or stretch.
  useEffect(() => {
    if (slotWidth === 0 || activeSlot < 0) return;
    const targetX =
      ROW_PAD + activeSlot * slotWidth + (slotWidth - BUBBLE) / 2;

    if (lastActiveSlot.current === activeSlot) {
      translateX.setValue(targetX);
      return;
    }
    lastActiveSlot.current = activeSlot;

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: targetX,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(scaleX, {
          toValue: 1.35,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(scaleX, {
          toValue: 1,
          duration: 200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }, [activeSlot, slotWidth, translateX, scaleX]);

  // Reset to the expanded size whenever the user switches tabs.
  useEffect(() => {
    setTabBarCompact(false);
  }, [state.index]);

  // Red dot on the Messages tab when there are any unread DMs.
  const [hasUnreadDms, setHasUnreadDms] = useState(
    getUnreadDmCountValue() > 0,
  );
  useEffect(() => {
    const unsub = subscribeUnreadDms((n) => setHasUnreadDms(n > 0));
    getUnreadDmCount().then(setUnreadDmCount);

    // Live updates: refresh the count when a new message arrives from someone
    // else. RLS limits delivered inserts to my own conversations.
    let myId: string | null = null;
    supabase.auth.getUser().then(({ data }) => {
      myId = data.user?.id ?? null;
    });
    const channel = supabase
      .channel('dm-unread')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const senderId = (payload.new as { sender_id?: string }).sender_id;
          if (senderId !== myId) {
            getUnreadDmCount().then(setUnreadDmCount);
          }
        },
      )
      .subscribe();

    // Keep the notification bell live too.
    getUnreadCount().then(setUnreadNotifications);
    const notifChannel = supabase
      .channel('notif-unread')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          getUnreadCount().then(setUnreadNotifications);
        },
      )
      .subscribe();

    return () => {
      unsub();
      supabase.removeChannel(channel);
      supabase.removeChannel(notifChannel);
    };
  }, []);

  const onRowLayout = (e: LayoutChangeEvent) =>
    setRowWidth(e.nativeEvent.layout.width);

  // Compress by ~10% when scrolling down; expand back when scrolling up.
  const barHeight = tabBarCompact.interpolate({
    inputRange: [0, 1],
    outputRange: [76, 69],
  });
  const marginH = tabBarCompact.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 27],
  });
  const radius = tabBarCompact.interpolate({
    inputRange: [0, 1],
    outputRange: [34, 30],
  });
  const bottomPad = tabBarCompact.interpolate({
    inputRange: [0, 1],
    outputRange: [insets.bottom + 9, insets.bottom + 6],
  });
  // Icons + labels shrink in place, proportional to the bar. Scaling each slot
  // (not the whole row) avoids the edge icons drifting toward the centre.
  const contentScale = tabBarCompact.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.92],
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: bottomPad }]}
    >
      <Animated.View
        style={[styles.shadowWrap, { marginHorizontal: marginH, borderRadius: radius }]}
      >
        <Animated.View style={[styles.bar, { height: barHeight, borderRadius: radius }]}>
          <BlurView
            tint="light"
            intensity={Platform.OS === 'android' ? 30 : 44}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.fill} />
          <View style={styles.topHighlight} />

          <View style={styles.row} onLayout={onRowLayout}>
            {slotWidth > 0 && activeSlot >= 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.bubble,
                  { transform: [{ translateX }, { scaleX }] },
                ]}
              />
            ) : null}

            {SLOTS.map((name) => {
              if (name === 'create') {
                return (
                  <View key="create" style={styles.slot}>
                    <PressableScale
                      outerStyle={styles.createTouch}
                      onPress={() => router.push('/create-post')}
                      scaleTo={0.88}
                      accessibilityLabel="New post"
                    >
                      <View style={styles.createCircle}>
                        <Icon source={tabIcons.plus} size={24} color="#FFFFFF" />
                      </View>
                    </PressableScale>
                  </View>
                );
              }

              const route = state.routes.find((r) => r.name === name);
              const active = focusedName === name;
              const onPress = () => {
                if (!route) return;
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!active && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              return (
                <Pressable
                  key={name}
                  style={styles.slot}
                  onPress={onPress}
                  accessibilityLabel={name}
                >
                  <Animated.View
                    style={[
                      styles.slotInner,
                      { transform: [{ scale: contentScale }] },
                    ]}
                  >
                    <View style={[styles.iconStack, active && styles.activeIcon]}>
                      <View style={{ opacity: active ? 0 : 1 }}>
                        <Icon source={TAB_ICON[name]} size={24} color={CHARCOAL} />
                      </View>
                      <View
                        style={[
                          StyleSheet.absoluteFill,
                          { opacity: active ? 1 : 0 },
                        ]}
                      >
                        <Icon
                          source={tabIconsFilled[name]}
                          size={24}
                          color={PURPLE}
                        />
                      </View>
                      {name === 'messages' && hasUnreadDms ? (
                        <View style={styles.dmDot} />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.label,
                        { color: active ? PURPLE : CHARCOAL },
                      ]}
                    >
                      {TAB_LABEL[name]}
                    </Text>
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  shadowWrap: {
    marginHorizontal: 18,
    borderRadius: 34,
    shadowColor: '#1F1438',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  bar: {
    height: 76,
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    elevation: 14,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(238, 233, 252, 0.62)',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  row: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ROW_PAD,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotInner: {
    alignItems: 'center',
    gap: 3,
  },
  iconStack: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dmDot: {
    position: 'absolute',
    top: -1,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: '#E23E57',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  activeIcon: {
    transform: [{ translateY: -1 }],
  },
  label: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '700',
  },
  bubble: {
    position: 'absolute',
    top: 9,
    left: 0,
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    backgroundColor: 'rgba(109, 40, 217, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: PURPLE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  createTouch: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -7 }],
    shadowColor: PURPLE,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
