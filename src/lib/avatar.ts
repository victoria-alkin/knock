import { pickAndUploadImage } from './storage';

/** Pick and upload the current user's avatar. Returns the public URL to store. */
export async function pickAndUploadAvatar() {
  return pickAndUploadImage({
    bucket: 'avatars',
    pathFor: (userId) => `${userId}/avatar.jpg`,
    aspect: [1, 1],
  });
}

/** Pick and upload a marketplace listing photo. Returns the public URL. */
export async function pickAndUploadListingPhoto() {
  return pickAndUploadImage({
    bucket: 'listing-photos',
    pathFor: (userId) =>
      `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`,
  });
}

/** Pick and upload a photo to attach to a post. Returns the public URL. */
export async function pickAndUploadPostPhoto() {
  return pickAndUploadImage({
    bucket: 'post-photos',
    pathFor: (userId) =>
      `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`,
  });
}
