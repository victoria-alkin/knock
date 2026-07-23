import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteAccount } from '@/lib/membership';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setWorking(true);
    setError(null);
    const { error: deleteError } = await deleteAccount();
    if (deleteError) {
      setError(deleteError);
      setWorking(false);
      return;
    }
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerSide}
        >
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Delete Account</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.warnIcon}>
          <Feather name="alert-triangle" size={26} color="#B4243F" />
        </View>

        <Text style={styles.lead}>This permanently deletes your account.</Text>

        <Text style={styles.body}>
          Deleting your account removes your profile, posts, comments, events,
          listings, RSVPs, messages, and everything else tied to you. This can
          not be undone, and because your account isn&apos;t linked to a phone
          or email, there&apos;s no way to recover it.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {confirming ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>
              Are you sure? This is permanent.
            </Text>
            <Pressable
              style={[styles.danger, working && styles.disabled]}
              disabled={working}
              onPress={handleDelete}
            >
              {working ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.dangerText}>Yes, delete my account</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.cancel}
              disabled={working}
              onPress={() => setConfirming(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable
              style={styles.danger}
              onPress={() => setConfirming(true)}
            >
              <Text style={styles.dangerText}>Delete My Account</Text>
            </Pressable>
            <Pressable style={styles.cancel} onPress={() => router.back()}>
              <Text style={styles.cancelText}>Keep My Account</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerSide: { width: 60 },
  back: { fontSize: 16, color: '#6D28D9', fontWeight: '700' },
  pageTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#1F1438',
  },
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  warnIcon: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: '#FDE7EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lead: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F1438',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    color: '#4A3D63',
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 24,
  },
  error: {
    fontSize: 15,
    color: '#B4243F',
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmBox: {
    backgroundColor: '#FDF3F5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0D6DC',
    padding: 18,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8A2436',
    textAlign: 'center',
    marginBottom: 16,
  },
  danger: {
    backgroundColor: '#B4243F',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  dangerText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  cancel: { paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  cancelText: { color: '#6D28D9', fontSize: 16, fontWeight: '700' },
});
