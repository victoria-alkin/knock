import * as Location from 'expo-location';

import { distanceMeters } from './buildings';

// How close (meters) the user must be to the building to pass verification.
export const VERIFY_RADIUS_METERS = 200;

export type VerifyResult =
  | { ok: true; distance: number }
  | {
      ok: false;
      reason: 'no-coords' | 'denied' | 'too-far' | 'error';
      distance?: number;
    };

/** Check whether the device is within range of the given building coordinates. */
export async function verifyAtBuilding(
  latitude: number,
  longitude: number,
): Promise<VerifyResult> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, reason: 'no-coords' };
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { ok: false, reason: 'denied' };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const meters = distanceMeters(
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      { latitude, longitude },
    );

    return meters <= VERIFY_RADIUS_METERS
      ? { ok: true, distance: meters }
      : { ok: false, reason: 'too-far', distance: meters };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
