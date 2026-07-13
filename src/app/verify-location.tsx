import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { distanceMeters } from '@/lib/buildings';

// How close (in meters) the user must be to the building to pass verification.
// Generous enough to absorb GPS drift, tight enough to mean "at the building".
const VERIFY_RADIUS_METERS = 200;

type Status =
  | 'idle'
  | 'checking'
  | 'success'
  | 'too-far'
  | 'denied'
  | 'error';

export default function VerifyLocationScreen() {
  const router = useRouter();
  const { placeId, name, address, latitude, longitude } =
    useLocalSearchParams<{
      placeId?: string;
      name?: string;
      address?: string;
      latitude?: string;
      longitude?: string;
    }>();

  const buildingLat = latitude ? Number(latitude) : NaN;
  const buildingLng = longitude ? Number(longitude) : NaN;
  const hasBuildingCoords =
    Number.isFinite(buildingLat) && Number.isFinite(buildingLng);

  const [status, setStatus] = useState<Status>('idle');
  const [distance, setDistance] = useState<number | null>(null);

  const runVerification = useCallback(async () => {
    if (!hasBuildingCoords) {
      setStatus('error');
      return;
    }

    setStatus('checking');

    try {
      const { status: permission } =
        await Location.requestForegroundPermissionsAsync();

      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const meters = distanceMeters(
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        { latitude: buildingLat, longitude: buildingLng },
      );

      setDistance(meters);
      setStatus(meters <= VERIFY_RADIUS_METERS ? 'success' : 'too-far');
    } catch {
      setStatus('error');
    }
  }, [hasBuildingCoords, buildingLat, buildingLng]);

  // Kick off verification automatically when the screen opens.
  useEffect(() => {
    runVerification();
  }, [runVerification]);

  const handleContinue = () => {
    router.push({
      pathname: '/profile-setup',
      params: { placeId, name, address, latitude, longitude },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Verify</Text>
        <Text style={styles.title}>Make sure you&apos;re in your building</Text>
        <Text style={styles.description}>
          To keep {name ?? 'your building'} private to residents, we check that
          you&apos;re here before you can join.
        </Text>

        <View style={styles.card}>
          <Text style={styles.buildingName}>{name ?? 'Selected building'}</Text>
          {address ? (
            <Text style={styles.buildingAddress}>{address}</Text>
          ) : null}
        </View>

        <View style={styles.statusArea}>
          {status === 'checking' && (
            <View style={styles.statusRow}>
              <ActivityIndicator color="#6D28D9" />
              <Text style={styles.statusText}>Checking your location…</Text>
            </View>
          )}

          {status === 'success' && (
            <View style={styles.statusBlock}>
              <Text style={styles.successBadge}>✓ Verified</Text>
              <Text style={styles.statusText}>
                You&apos;re at the building. You can join the community.
              </Text>
            </View>
          )}

          {status === 'too-far' && (
            <View style={styles.statusBlock}>
              <Text style={styles.errorTitle}>You&apos;re not here yet</Text>
              <Text style={styles.statusText}>
                You need to be inside {name ?? 'the building'} to verify
                {distance != null
                  ? ` — you're about ${formatDistance(distance)} away.`
                  : '.'}
              </Text>
            </View>
          )}

          {status === 'denied' && (
            <View style={styles.statusBlock}>
              <Text style={styles.errorTitle}>Location access needed</Text>
              <Text style={styles.statusText}>
                Knock needs your location to verify you live here. Enable it in
                your device settings, then try again.
              </Text>
            </View>
          )}

          {status === 'error' && (
            <View style={styles.statusBlock}>
              <Text style={styles.errorTitle}>Something went wrong</Text>
              <Text style={styles.statusText}>
                {hasBuildingCoords
                  ? "We couldn't read your location. Please try again."
                  : "This building is missing location data, so we can't verify it."}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {status === 'success' ? (
            <Pressable style={styles.primaryButton} onPress={handleContinue}>
              <Text style={styles.primaryButtonText}>Continue</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.primaryButton,
                status === 'checking' && styles.primaryButtonDisabled,
              ]}
              disabled={status === 'checking'}
              onPress={runVerification}
            >
              <Text style={styles.primaryButtonText}>
                {status === 'checking' ? 'Checking…' : 'Try again'}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>
              Choose a different building
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
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
    fontSize: 32,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#67597F',
    lineHeight: 23,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E7DFF5',
  },
  buildingName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 6,
  },
  buildingAddress: {
    fontSize: 15,
    color: '#76698C',
  },
  statusArea: {
    marginTop: 24,
    minHeight: 80,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBlock: {
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#67597F',
    lineHeight: 23,
  },
  successBadge: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B873F',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1438',
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
  primaryButtonDisabled: {
    opacity: 0.6,
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
