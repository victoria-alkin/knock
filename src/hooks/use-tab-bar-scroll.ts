import { useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { setTabBarCompact } from '@/lib/tab-bar-compact';

// Only flip after this much clear directional movement, so tiny scrolls or
// bounce jitter never toggle the bar.
const THRESHOLD = 14;

/**
 * Returns an onScroll handler for a tab screen's ScrollView. Scrolling down
 * compacts the tab bar; scrolling up (or reaching the top) expands it.
 * Pair with `scrollEventThrottle={16}`.
 */
export function useTabBarScroll() {
  const lastY = useRef(0);
  const accum = useRef(0);

  return (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - lastY.current;
    lastY.current = y;

    // Always fully expanded near the top.
    if (y <= 6) {
      accum.current = 0;
      setTabBarCompact(false);
      return;
    }
    if (Math.abs(dy) < 0.5) return;

    // Reset the accumulator whenever direction flips.
    if (dy > 0 !== accum.current > 0) accum.current = 0;
    accum.current += dy;

    if (accum.current > THRESHOLD) {
      setTabBarCompact(true);
      accum.current = 0;
    } else if (accum.current < -THRESHOLD) {
      setTabBarCompact(false);
      accum.current = 0;
    }
  };
}
