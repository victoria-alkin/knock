import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { getUnreadCount } from '@/lib/notifications';
import {
  getUnreadNotificationsValue,
  setUnreadNotifications,
  subscribeUnreadNotifications,
} from '@/lib/unread-notifications';

/**
 * Unread notification count for the bell. Reads from a shared store that the
 * tab bar keeps live via realtime, and re-syncs whenever the screen is focused.
 */
export function useUnreadNotifications(): number {
  const [count, setCount] = useState(getUnreadNotificationsValue());

  useEffect(() => subscribeUnreadNotifications(setCount), []);

  useFocusEffect(
    useCallback(() => {
      getUnreadCount().then(setUnreadNotifications);
    }, []),
  );

  return count;
}
