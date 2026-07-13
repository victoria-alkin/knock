import { StyleSheet, Text } from 'react-native';

import { PostUrgency, URGENCY_META } from '@/lib/posts';

export function UrgencyBadge({ urgency }: { urgency: PostUrgency }) {
  if (urgency === 'normal') return null;
  const meta = URGENCY_META[urgency];
  return (
    <Text style={[styles.badge, { color: meta.color, backgroundColor: meta.bg }]}>
      {meta.label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 11,
    fontWeight: '800',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
