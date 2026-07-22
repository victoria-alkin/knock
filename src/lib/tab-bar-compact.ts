import { Animated } from 'react-native';

// Shared 0→1 value driving the tab bar's size. 0 = expanded, 1 = compact.
// The tab screens set the target on scroll; the tab bar interpolates from it.
export const tabBarCompact = new Animated.Value(0);

let target = 0;

export function setTabBarCompact(compact: boolean) {
  const next = compact ? 1 : 0;
  if (next === target) return; // ignore repeats, no constant re-animating
  target = next;
  Animated.spring(tabBarCompact, {
    toValue: next,
    useNativeDriver: false,
    speed: 12,
    bounciness: 0,
  }).start();
}
