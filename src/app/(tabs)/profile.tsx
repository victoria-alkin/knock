import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getMyBuilding,
  getMyProfile,
  MyBuilding,
  MyProfile,
  signOut,
} from '@/lib/membership';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [building, setBuilding] = useState<MyBuilding | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [p, b] = await Promise.all([getMyProfile(), getMyBuilding()]);
        if (active) {
          setProfile(p);
          setBuilding(b);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#6D28D9" />
      </SafeAreaView>
    );
  }

  const initial = (profile?.display_name ?? '?').trim().charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial || '?'}</Text>
          </View>
          <Text style={styles.displayName}>
            {profile?.display_name ?? 'You'}
          </Text>
          {profile?.full_name ? (
            <Text style={styles.fullName}>{profile.full_name}</Text>
          ) : null}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Building</Text>
          <Text style={styles.infoValue}>{building?.name ?? '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{profile?.phone ?? '—'}</Text>
        </View>

        <Pressable
          style={styles.editButton}
          onPress={() => router.push('/edit-profile')}
        >
          <Text style={styles.editButtonText}>Edit profile</Text>
        </Pressable>

        {confirmingSignOut ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>
              Sign out? Because your account isn&apos;t linked to a phone or
              email yet, you&apos;ll need to set up again on this device.
            </Text>
            <Pressable style={styles.signOutConfirm} onPress={handleSignOut}>
              <Text style={styles.signOutConfirmText}>Yes, sign out</Text>
            </Pressable>
            <Pressable
              style={styles.cancelButton}
              onPress={() => setConfirmingSignOut(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.signOutButton}
            onPress={() => setConfirmingSignOut(true)}
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2FF',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1F1438',
    marginBottom: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F1438',
  },
  fullName: {
    fontSize: 15,
    color: '#76698C',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: '#76698C',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: '#1F1438',
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  editButton: {
    backgroundColor: '#6D28D9',
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  signOutButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  signOutText: {
    color: '#B4243F',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0D6DC',
    padding: 18,
    marginTop: 16,
  },
  confirmText: {
    fontSize: 15,
    color: '#67597F',
    lineHeight: 22,
    marginBottom: 16,
  },
  signOutConfirm: {
    backgroundColor: '#B4243F',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  signOutConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6D28D9',
    fontSize: 15,
    fontWeight: '700',
  },
});
