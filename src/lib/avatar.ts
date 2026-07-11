import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

/**
 * Let the user pick an image and upload it as their avatar. Returns the public
 * URL (with a cache-busting query) to store on their profile.
 */
export async function pickAndUploadAvatar(): Promise<{
  url?: string;
  error?: string;
  canceled?: boolean;
}> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
    base64: true,
  });

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

  const path = `${user.id}/avatar.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, {
      contentType: asset.mimeType ?? 'image/jpeg',
      upsert: true,
    });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Bust the CDN/browser cache so a replaced avatar shows immediately.
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}
