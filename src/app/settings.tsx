import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();

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
        <Text style={styles.pageTitle}>Settings</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Legal</Text>
        <View style={styles.card}>
          <Pressable
            style={[styles.row, styles.rowDivider]}
            onPress={() => router.push('/privacy')}
          >
            <Feather
              name="shield"
              size={20}
              color="#4A3D63"
              style={styles.rowIcon}
            />
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <Feather name="chevron-right" size={20} color="#B9A9D4" />
          </Pressable>
          <Pressable
            style={[styles.row, styles.rowDivider]}
            onPress={() => router.push('/terms')}
          >
            <Feather
              name="file-text"
              size={20}
              color="#4A3D63"
              style={styles.rowIcon}
            />
            <Text style={styles.rowLabel}>Terms of Service</Text>
            <Feather name="chevron-right" size={20} color="#B9A9D4" />
          </Pressable>
          <Pressable
            style={styles.row}
            onPress={() => router.push('/help-support')}
          >
            <Feather
              name="help-circle"
              size={20}
              color="#4A3D63"
              style={styles.rowIcon}
            />
            <Text style={styles.rowLabel}>Help & Support</Text>
            <Feather name="chevron-right" size={20} color="#B9A9D4" />
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, styles.sectionSpacer]}>Account</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.row}
            onPress={() => router.push('/delete-account')}
          >
            <Feather
              name="trash-2"
              size={20}
              color="#B4243F"
              style={styles.rowIcon}
            />
            <Text style={[styles.rowLabel, styles.danger]}>Delete Account</Text>
            <Feather name="chevron-right" size={20} color="#B9A9D4" />
          </Pressable>
        </View>
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
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8A7BA3',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFF5',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#F0EBF9' },
  sectionSpacer: { marginTop: 26 },
  rowIcon: { width: 32 },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#2A1F42' },
  danger: { color: '#B4243F', fontWeight: '700' },
});
