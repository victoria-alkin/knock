import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getInvite, InviteInfo } from '@/lib/invites';

export default function JoinScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!code) return;
      const result = await getInvite(code);
      if (active) {
        setInvite(result);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [code]);

  const handleJoin = () => {
    if (!invite) return;
    router.replace({
      pathname: '/profile-setup',
      params: {
        placeId: invite.placeId,
        name: invite.buildingName,
        address: invite.buildingAddress ?? '',
        latitude: invite.latitude != null ? String(invite.latitude) : '',
        longitude: invite.longitude != null ? String(invite.longitude) : '',
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#6D28D9" />
      </SafeAreaView>
    );
  }

  if (!invite) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <View style={styles.content}>
          <Text style={styles.title}>Invite not found</Text>
          <Text style={styles.subtitle}>
            This invite link is invalid or has expired.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.replace('/')}>
            <Text style={styles.primaryButtonText}>Get started</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, styles.centered]}>
      <View style={styles.content}>
        <Image
          source={require('@/assets/images/knock-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.eyebrow}>You&apos;re invited</Text>
        <Text style={styles.title}>
          Join {invite.inviterName} in {invite.buildingName}
        </Text>
        {invite.buildingAddress ? (
          <Text style={styles.address}>{invite.buildingAddress}</Text>
        ) : null}
        <Text style={styles.subtitle}>
          Knock is the private community app for {invite.buildingName}.
        </Text>

        <Pressable style={styles.primaryButton} onPress={handleJoin}>
          <Text style={styles.primaryButtonText}>Join {invite.buildingName}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
  },
  logo: { width: 150, height: 56, marginBottom: 28 },
  eyebrow: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6D28D9',
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1F1438',
    textAlign: 'center',
    marginBottom: 10,
  },
  address: {
    fontSize: 15,
    color: '#76698C',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#67597F',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#6D28D9',
    borderRadius: 999,
    paddingVertical: 17,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
});
