import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SUPPORT_EMAIL = 'knock.app.support@gmail.com';

export default function HelpSupportScreen() {
  const router = useRouter();

  const emailSupport = () => {
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Knock support')}`,
    ).catch(() => {
      // If no mail app is set up, there's nothing more we can do here.
    });
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
        <Text style={styles.pageTitle}>Help & Support</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>
          Need a hand or want to share feedback? We&apos;re happy to help.
        </Text>

        <Pressable style={styles.card} onPress={emailSupport}>
          <View style={styles.cardIcon}>
            <Feather name="mail" size={20} color="#6D28D9" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Email us</Text>
            <Text style={styles.cardValue}>{SUPPORT_EMAIL}</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#B9A9D4" />
        </Pressable>

        <Text style={styles.note}>
          Reach out about anything: a bug, a question, a safety concern, or an
          idea to make Knock better. We usually reply within a couple of days.
        </Text>
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
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  lead: {
    fontSize: 16,
    color: '#4A3D63',
    lineHeight: 23,
    marginTop: 6,
    marginBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    padding: 16,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F1ECFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1F1438' },
  cardValue: { fontSize: 14, color: '#6D28D9', fontWeight: '600', marginTop: 2 },
  note: {
    fontSize: 14,
    color: '#76698C',
    lineHeight: 21,
    marginTop: 18,
  },
});
