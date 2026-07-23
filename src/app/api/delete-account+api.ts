// Server-only account deletion (App Store guideline 5.1.1(v)).
//
// Deleting the auth user cascades to the user's profile and, from there, to all
// of their data (posts, replies, comments, listings, events, messages, RSVPs,
// likes, blocks, reports, memberships, push tokens, private contact). Any
// notifications they triggered for others have their actor_id set null.
//
// Security: the service key never leaves the server; we verify the caller's own
// session token and only ever delete that verified user.
import { createClient } from '@supabase/supabase-js';

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

  const token = (request.headers.get('authorization') ?? '').replace(
    /^Bearer\s+/i,
    '',
  );
  if (!token) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 });
  }

  // Confirm the caller's identity from their own bearer token.
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

  // Delete only the verified caller. Cascades handle all of their data.
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
