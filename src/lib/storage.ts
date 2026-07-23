import { encode } from 'base64-arraybuffer';
import Constants from 'expo-constants';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// Uploads go through our /api/upload server route (see the note there). On web
// that's same-origin; on native we can't use a relative URL, so target the dev
// server during development and the deployed origin otherwise.
const PRODUCTION_ORIGIN = 'https://knock-psi.vercel.app';

export function apiUrl(path: string): string {
  if (Platform.OS === 'web') return path;
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const scheme = /exp\.(direct|host)/.test(hostUri) ? 'https' : 'http';
      return `${scheme}://${hostUri}${path}`;
    }
  }
  return `${PRODUCTION_ORIGIN}${path}`;
}

/**
 * Pick an image from the library and upload it via the server route, which
 * stores it under the user's own folder and returns a cache-busted public URL.
 */
export async function pickAndUploadImage(opts: {
  bucket: string;
  aspect?: [number, number];
  /** Longest edge to shrink to before upload (keeps payloads small/fast). */
  maxDim?: number;
}): Promise<{ url?: string; error?: string; canceled?: boolean }> {
  // Ask for photo-library access first (required on iOS).
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return {
      error: 'To add a photo, allow photo access in Settings, then try again.',
    };
  }

  let result;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: opts.aspect,
      quality: 1,
    });
  } catch {
    return { error: 'Could not open the photo library.' };
  }

  if (result.canceled) return { canceled: true };
  const asset = result.assets[0];

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: 'You are not signed in.' };

  // Shrink + recompress before upload so the payload is small and fast.
  const maxDim = opts.maxDim ?? 1400;
  let base64: string | null = null;
  try {
    const needsResize = !!asset.width && asset.width > maxDim;
    const out = await manipulateAsync(
      asset.uri,
      needsResize ? [{ resize: { width: maxDim } }] : [],
      { compress: 0.6, format: SaveFormat.JPEG, base64: true },
    );
    base64 = out.base64 ?? null;
  } catch {
    // Fall back to the original image if manipulation isn't available.
  }
  if (!base64) {
    try {
      const buffer = await (await fetch(asset.uri)).arrayBuffer();
      base64 = encode(buffer);
    } catch {
      return { error: 'Could not read the selected image.' };
    }
  }

  let res: Response;
  try {
    res = await fetch(apiUrl('/api/upload'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        bucket: opts.bucket,
        base64,
        contentType: 'image/jpeg',
      }),
    });
  } catch {
    return { error: 'Could not reach the upload service.' };
  }

  if (!res.ok) {
    let message = 'Upload failed.';
    try {
      const json = (await res.json()) as { error?: string };
      if (json?.error) message = json.error;
    } catch {
      // keep default message
    }
    return { error: message };
  }

  try {
    const { url } = (await res.json()) as { url: string };
    return { url };
  } catch {
    return { error: 'Upload service returned an unexpected response.' };
  }
}
