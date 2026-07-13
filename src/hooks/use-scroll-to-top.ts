import { useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';

/**
 * Returns a ref to attach to a ScrollView. Tapping the current tab again
 * scrolls it back to the top.
 */
export function useScrollToTop() {
  const navigation = useNavigation();
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const unsub = navigation.addListener('tabPress' as never, () => {
      ref.current?.scrollTo({ y: 0, animated: true });
    });
    return unsub;
  }, [navigation]);

  return ref;
}
