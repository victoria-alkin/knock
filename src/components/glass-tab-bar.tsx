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
import { setTabBarCompact, tabBarCompact } from '@/lib/tab-bar-compact';

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

  const onRowLayout = (e: LayoutChangeEvent) =>
    setRowWidth(e.nativeEvent.layout.width);

  // Compress by ~10% when scrolling down; expand back when scrolling up.
  const barHeight = tabBarCompact.interpolate({
    inputRange: [0, 1],
    outputRange: [76, 72],
  });
  const marginH = tabBarCompact.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 23],
  });
  const radius = tabBarCompact.interpolate({
    inputRange: [0, 1],
    outputRange: [34, 32],
  });
  const bottomPad = tabBarCompact.interpolate({
    inputRange: [0, 1],
    outputRange: [insets.bottom + 12, insets.bottom + 10],
  });
  const contentScale = tabBarCompact.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.95],
  });
  // Cancels the row's scale on the active bubble so it never changes size.
  const bubbleCounterScale = tabBarCompact.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1 / 0.95],
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

          <Animated.View
            style={[styles.row, { transform: [{ scale: contentScale }] }]}
            onLayout={onRowLayout}
          >
            {slotWidth > 0 && activeSlot >= 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.bubble,
                  {
                    transform: [
                      { translateX },
                      { scaleX },
                      { scale: bubbleCounterScale },
                    ],
                  },
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
                  <View style={active ? styles.activeIcon : undefined}>
                    <Icon
                      source={active ? tabIconsFilled[name] : TAB_ICON[name]}
                      size={active ? 25 : 23}
                      color={active ? PURPLE : CHARCOAL}
                    />
                  </View>
                  <Text
                    style={[styles.label, { color: active ? PURPLE : CHARCOAL }]}
                  >
                    {TAB_LABEL[name]}
                  </Text>
                </Pressable>
              );
            })}
          </Animated.View>
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
    gap: 3,
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
