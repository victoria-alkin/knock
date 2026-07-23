import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { blockUser } from '@/lib/blocks';

/**
 * A small overlay of moderation actions for a specific neighbor: Report (handed
 * back to the parent) and Block (handled here, then the parent refreshes).
 */
export function UserActionsSheet({
  visible,
  userId,
  userName,
  reportLabel = 'Report',
  onClose,
  onReport,
  onBlocked,
}: {
  visible: boolean;
  userId: string;
  userName: string;
  /** Label for the report action (e.g. "Report post"). Defaults to "Report". */
  reportLabel?: string;
  onClose: () => void;
  onReport: () => void;
  onBlocked: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setConfirming(false);
      setWorking(false);
      setError(null);
    }
  }, [visible]);

  if (!visible) return null;

  const doBlock = async () => {
    setWorking(true);
    setError(null);
    const { error: blockError } = await blockUser(userId);
    setWorking(false);
    if (blockError) {
      setError(blockError);
      return;
    }
    onBlocked();
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.sheet}>
        {confirming ? (
          <>
            <Text style={styles.title}>Block {userName}?</Text>
            <Text style={styles.sub}>
              You won&apos;t see each other&apos;s posts, comments, or listings,
              and neither of you can message the other. You can unblock them any
              time from Settings.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.danger, working && styles.disabled]}
              disabled={working}
              onPress={doBlock}
            >
              <Text style={styles.dangerText}>
                {working ? 'Blocking…' : `Block ${userName}`}
              </Text>
            </Pressable>
            <Pressable style={styles.cancel} onPress={() => setConfirming(false)}>
              <Text style={styles.cancelText}>Back</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>{userName}</Text>
            <Pressable style={styles.action} onPress={onReport}>
              <Text style={styles.actionText}>{reportLabel}</Text>
            </Pressable>
            <Pressable
              style={styles.action}
              onPress={() => setConfirming(true)}
            >
              <Text style={[styles.actionText, styles.blockText]}>
                Block {userName}
              </Text>
            </Pressable>
            <Pressable style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(31, 20, 56, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  sheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#1F1438', marginBottom: 6 },
  sub: { fontSize: 14, color: '#76698C', lineHeight: 20, marginBottom: 16 },
  action: {
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0EBF9',
  },
  actionText: { fontSize: 16, fontWeight: '700', color: '#2A1F42' },
  blockText: { color: '#B4243F' },
  error: { fontSize: 14, color: '#B4243F', marginBottom: 12 },
  danger: {
    backgroundColor: '#B4243F',
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  dangerText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  cancel: { paddingVertical: 13, alignItems: 'center', marginTop: 2 },
  cancelText: { color: '#6D28D9', fontSize: 15, fontWeight: '700' },
});
