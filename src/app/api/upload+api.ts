// Server-only image upload.
//
// This project's Storage service rejects direct authenticated client uploads,
// so instead the client sends the image here and we upload with the service
// role (which bypasses Storage's auth layer, exactly like the dashboard does).
//
// Security: the service key never leaves the server; we verify the caller's
// session token and force every file into that user's own folder, so a user
// can only ever write under "{their id}/...".
import { createClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';

const ALLOWED_BUCKETS = new Set([
  'avatars',
  'listing-photos',
  'post-photos',
  'event-photos',
]);

function pathFor(bucket: string, userId: string): string {
  if (bucket === 'avatars') return `${userId}/avatar.jpg`;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${userId}/${Date.now()}-${rand}.jpg`;
}

export async function POST(request: Request) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !serviceKey || !anonKey) {
    return Response.json(
      { error: 'Server is missing Supabase configuration.' },
      { status: 500 },
    );
  }

  // Verify the caller from their bearer token.
  const token = (request.headers.get('authorization') ?? '').replace(
    /^Bearer\s+/i,
    '',
  );
  if (!token) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(token);
  if (userError || !user) {
    return Response.json({ error: 'Your session is invalid.' }, { status: 401 });
  }

  let body: { bucket?: string; base64?: string; contentType?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { bucket, base64, contentType } = body;
  if (!bucket || !ALLOWED_BUCKETS.has(bucket)) {
    return Response.json({ error: 'Unknown bucket.' }, { status: 400 });
  }
  if (!base64) {
    return Response.json({ error: 'Missing image data.' }, { status: 400 });
  }

  // The path always starts with the verified user's id, so the client can't
  // choose someone else's folder.
  const path = pathFor(bucket, user.id);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(path, decode(base64), {
      contentType: contentType ?? 'image/jpeg',
      upsert: true,
    });
  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return Response.json({ url: `${data.publicUrl}?v=${Date.now()}` });
}
