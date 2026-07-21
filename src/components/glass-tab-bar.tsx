import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import { tabIcons } from '@/constants/icons';

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

  // Slide the active bubble to the focused tab, stretching into a pill on the
  // way and settling back to a circle.
  useEffect(() => {
    if (slotWidth === 0 || activeSlot < 0) return;
    const targetX =
      ROW_PAD + activeSlot * slotWidth + (slotWidth - BUBBLE) / 2;
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: targetX,
        useNativeDriver: true,
        damping: 18,
        stiffness: 170,
        mass: 0.9,
      }),
      Animated.sequence([
        Animated.timing(scaleX, {
          toValue: 1.5,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.spring(scaleX, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 200,
        }),
      ]),
    ]).start();
  }, [activeSlot, slotWidth, translateX, scaleX]);

  const onRowLayout = (e: LayoutChangeEvent) =>
    setRowWidth(e.nativeEvent.layout.width);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: insets.bottom + 12 }]}
    >
      <View style={styles.shadowWrap}>
        <View style={styles.bar}>
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
                  <View style={active ? styles.activeIcon : undefined}>
                    <Icon
                      source={TAB_ICON[name]}
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
          </View>
        </View>
      </View>
    </View>
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
