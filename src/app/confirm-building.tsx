import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ConfirmBuildingScreen() {
  const router = useRouter();
  const { name, address, placeId, latitude, longitude } =
    useLocalSearchParams<{
      name?: string;
      address?: string;
      placeId?: string;
      latitude?: string;
      longitude?: string;
    }>();

  const handleConfirm = () => {
    router.push({
      pathname: '/verify-location',
      params: { name, address, placeId, latitude, longitude },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Confirm</Text>
        <Text style={styles.title}>Is this your building?</Text>

        <View style={styles.card}>
          <Text style={styles.buildingName}>{name ?? 'Selected building'}</Text>
          {address ? <Text style={styles.buildingAddress}>{address}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={handleConfirm}>
            <Text style={styles.primaryButtonText}>Yes, this is my building</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Search again</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  eyebrow: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6D28D9',
    marginBottom: 14,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 26,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E7DFF5',
  },
  buildingName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 8,
  },
  buildingAddress: {
    fontSize: 16,
    color: '#76698C',
  },
  actions: {
    marginTop: 'auto',
    marginBottom: 12,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#6D28D9',
    paddingVertical: 17,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6D28D9',
    fontSize: 16,
    fontWeight: '700',
  },
});
