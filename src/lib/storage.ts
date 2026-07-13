import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

/**
 * Pick an image from the library and upload it to a Storage bucket under the
 * user's own folder. Returns a cache-busted public URL.
 */
export async function pickAndUploadImage(opts: {
  bucket: string;
  pathFor: (userId: string) => string;
  aspect?: [number, number];
}): Promise<{ url?: string; error?: string; canceled?: boolean }> {
  // Ask for photo-library access first (required on iOS).
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return {
      error:
        'Photo access is needed to add a photo. Enable it for Expo Go in Settings.',
    };
  }

  let result;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: opts.aspect,
      quality: 0.6,
      base64: true,
    });
  } catch {
    return { error: 'Could not open the photo library.' };
  }

  if (result.canceled) return { canceled: true };
  const asset = result.assets[0];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  // Cross-platform: base64 on native, blob/arrayBuffer on web.
  let bytes: ArrayBuffer;
  if (asset.base64) {
    bytes = decode(asset.base64);
  } else {
    bytes = await (await fetch(asset.uri)).arrayBuffer();
  }

  const path = opts.pathFor(user.id);
  const { error } = await supabase.storage
    .from(opts.bucket)
    .upload(path, bytes, {
      contentType: asset.mimeType ?? 'image/jpeg',
      upsert: true,
    });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from(opts.bucket).getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}
