import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getInviteLink } from '@/lib/invites';
import { getMyBuilding } from '@/lib/membership';

export default function InviteScreen() {
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [buildingName, setBuildingName] = useState('your building');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ link: inviteLink, error: linkError }, building] =
        await Promise.all([getInviteLink(), getMyBuilding()]);
      if (!active) return;
      if (inviteLink) setLink(inviteLink);
      else setError(linkError ?? 'Could not create an invite link.');
      if (building) setBuildingName(building.name);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleCopy = async () => {
    if (!link) return;
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!link) return;
    try {
      await Share.share({
        message: `Join me on Knock — our private community for ${buildingName}: ${link}`,
      });
    } catch {
      // user dismissed the share sheet
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Invite your neighbors</Text>
        <Text style={styles.subtitle}>
          Share this link so neighbors can join {buildingName} — it takes them
          straight to your building.
        </Text>

        {loading ? (
          <ActivityIndicator color="#6D28D9" style={styles.loader} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            <View style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={2}>
                {link}
              </Text>
            </View>

            <Pressable style={styles.primaryButton} onPress={handleShare}>
              <Text style={styles.primaryButtonText}>Share link</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={handleCopy}>
              <Text style={styles.secondaryButtonText}>
                {copied ? 'Copied!' : 'Copy link'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  back: { fontSize: 16, color: '#6D28D9', fontWeight: '700' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1F1438',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#67597F',
    lineHeight: 23,
    marginBottom: 28,
  },
  loader: { marginTop: 20 },
  errorText: { fontSize: 15, color: '#B4243F' },
  linkBox: {
    backgroundColor: '#F1ECFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    padding: 18,
    marginBottom: 20,
  },
  linkText: { fontSize: 15, color: '#4A3D63', fontWeight: '600' },
  primaryButton: {
    backgroundColor: '#6D28D9',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  secondaryButton: { paddingVertical: 14, alignItems: 'center' },
  secondaryButtonText: { color: '#6D28D9', fontSize: 16, fontWeight: '700' },
});
