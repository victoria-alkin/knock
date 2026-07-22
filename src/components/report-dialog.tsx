import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  REPORT_REASONS,
  ReportTargetType,
  submitReport,
} from '@/lib/reports';

export function ReportDialog({
  visible,
  targetType,
  targetId,
  targetLabel,
  onClose,
}: {
  visible: boolean;
  targetType: ReportTargetType;
  targetId: string;
  /** e.g. "post", "comment", "listing", "neighbor". */
  targetLabel: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setReason(null);
      setNote('');
      setDone(false);
      setError(null);
      setSubmitting(false);
    }
  }, [visible]);

  if (!visible) return null;

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    const { error: submitError } = await submitReport(
      targetType,
      targetId,
      reason,
      note,
    );
    setSubmitting(false);
    // A duplicate report still lands the user on the thank-you state.
    if (submitError) {
      setError(submitError);
      return;
    }
    setDone(true);
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.dialog}>
        {done ? (
          <>
            <Text style={styles.title}>Thanks for letting us know</Text>
            <Text style={styles.sub}>
              We&apos;ll review this {targetLabel}. Reports are anonymous to
              other residents.
            </Text>
            <Pressable style={styles.primary} onPress={onClose}>
              <Text style={styles.primaryText}>Done</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>Report {targetLabel}</Text>
            <Text style={styles.sub}>What&apos;s wrong with it?</Text>

            {REPORT_REASONS.map((r) => {
              const selected = reason === r;
              return (
                <Pressable
                  key={r}
                  style={[styles.reasonRow, selected && styles.reasonRowOn]}
                  onPress={() => setReason(r)}
                >
                  <Text
                    style={[
                      styles.reasonText,
                      selected && styles.reasonTextOn,
                    ]}
                  >
                    {r}
                  </Text>
                  {selected ? (
                    <Feather name="check" size={18} color="#6D28D9" />
                  ) : null}
                </Pressable>
              );
            })}

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add a note (optional)"
              placeholderTextColor="#9B8CAF"
              style={styles.note}
              multiline
              maxLength={1000}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[
                styles.primary,
                (!reason || submitting) && styles.primaryDisabled,
              ]}
              disabled={!reason || submitting}
              onPress={submit}
            >
              <Text style={styles.primaryText}>
                {submitting ? 'Submitting…' : 'Submit report'}
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
  dialog: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  title: { fontSize: 19, fontWeight: '800', color: '#1F1438', marginBottom: 6 },
  sub: { fontSize: 14, color: '#76698C', lineHeight: 20, marginBottom: 14 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    marginBottom: 8,
  },
  reasonRowOn: { borderColor: '#6D28D9', backgroundColor: '#F5F0FE' },
  reasonText: { fontSize: 15, fontWeight: '600', color: '#2A1F42' },
  reasonTextOn: { color: '#6D28D9', fontWeight: '800' },
  note: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 64,
    fontSize: 15,
    color: '#1F1438',
    marginTop: 4,
    marginBottom: 12,
  },
  error: { fontSize: 14, color: '#B4243F', marginBottom: 12 },
  primary: {
    backgroundColor: '#6D28D9',
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  cancel: { paddingVertical: 13, alignItems: 'center', marginTop: 2 },
  cancelText: { color: '#6D28D9', fontSize: 15, fontWeight: '700' },
});
