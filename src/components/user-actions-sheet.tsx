import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { blockUser } from '@/lib/blocks';

/**
 * A small action sheet of moderation actions for a specific neighbor: Report
 * (handed back to the parent) and Block (handled here, then the parent refreshes).
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
  const insets = useSafeAreaInsets();
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
      <View style={[styles.dock, { paddingBottom: insets.bottom + 12 }]}>
        {confirming ? (
          <View style={styles.card}>
            <View style={styles.confirmIcon}>
              <Feather name="slash" size={24} color="#B4243F" />
            </View>
            <Text style={styles.confirmTitle}>Block {userName}?</Text>
            <Text style={styles.confirmText}>
              You won&apos;t see each other&apos;s posts, comments, or listings,
              and neither of you can message the other. You can unblock any time
              from Settings.
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
            <Pressable style={styles.ghost} onPress={() => setConfirming(false)}>
              <Text style={styles.ghostText}>Back</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={onReport}
              >
                <View style={[styles.iconWrap, styles.iconReport]}>
                  <Feather name="flag" size={17} color="#6D28D9" />
                </View>
                <Text style={styles.rowText}>{reportLabel}</Text>
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => setConfirming(true)}
              >
                <View style={[styles.iconWrap, styles.iconBlock]}>
                  <Feather name="slash" size={17} color="#B4243F" />
                </View>
                <Text style={[styles.rowText, styles.blockText]}>
                  Block {userName}
                </Text>
              </Pressable>
            </View>

            <Pressable style={styles.cancelCard} onPress={onClose}>
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
    backgroundColor: 'rgba(31, 20, 56, 0.4)',
    justifyContent: 'flex-end',
  },
  dock: { paddingHorizontal: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#1F1438',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  rowPressed: { backgroundColor: '#F5F0FE' },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconReport: { backgroundColor: '#F1ECFA' },
  iconBlock: { backgroundColor: '#FDE7EC' },
  rowText: { fontSize: 16, fontWeight: '700', color: '#2A1F42' },
  blockText: { color: '#B4243F' },
  divider: { height: 1, backgroundColor: '#F0EBF9', marginLeft: 64 },
  cancelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#1F1438',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cancelText: { fontSize: 16, fontWeight: '800', color: '#6D28D9' },
  // Confirm state
  confirmIcon: {
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: '#FDE7EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1F1438',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  confirmText: {
    fontSize: 14,
    color: '#76698C',
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  error: {
    fontSize: 14,
    color: '#B4243F',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  danger: {
    backgroundColor: '#B4243F',
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  disabled: { opacity: 0.5 },
  dangerText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  ghost: { paddingVertical: 14, alignItems: 'center', marginTop: 2, marginBottom: 6 },
  ghostText: { color: '#6D28D9', fontSize: 15, fontWeight: '700' },
});
