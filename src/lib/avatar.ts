import { pickAndUploadImage } from './storage';

/** Pick and upload the current user's avatar. Returns the public URL to store. */
export async function pickAndUploadAvatar() {
  return pickAndUploadImage({ bucket: 'avatars', aspect: [1, 1], maxDim: 512 });
}

/** Pick and upload a marketplace listing photo. Returns the public URL. */
export async function pickAndUploadListingPhoto() {
  return pickAndUploadImage({ bucket: 'listing-photos' });
}

/** Pick and upload a photo to attach to a post. Returns the public URL. */
export async function pickAndUploadPostPhoto() {
  return pickAndUploadImage({ bucket: 'post-photos' });
}

/** Pick and upload an event cover photo. Returns the public URL. */
export async function pickAndUploadEventPhoto() {
  return pickAndUploadImage({ bucket: 'event-photos', aspect: [16, 9] });
}
