// Server-only content moderation using a maintained public word list.
//
// The client sends user text here before creating a post/comment/listing/etc.
// We compare it against the LDNOOBW list ("List of Dirty, Naughty, Obscene and
// Otherwise Bad Words", originally from Shutterstock, CC BY 4.0), fetched from
// the jsDelivr CDN and cached in memory. The user's text never leaves our
// server; we only download the word list.
//
// Fails "open" (flagged: false) on any error, so a moderation outage never
// blocks people from using the app. Report + block remain the backstop.
import { createClient } from '@supabase/supabase-js';

const LIST_URL =
  'https://cdn.jsdelivr.net/gh/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words@master/en';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // refresh the list at most daily

type WordList = { words: Set<string>; phrases: string[] };
let cache: { list: WordList; at: number } | null = null;

async function getList(): Promise<WordList | null> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.list;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(LIST_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return cache?.list ?? null;

    const text = await res.text();
    const words = new Set<string>();
    const phrases: string[] = [];
    for (const raw of text.split('\n')) {
      const entry = raw.trim().toLowerCase();
      if (!entry) continue;
      if (entry.includes(' ')) phrases.push(entry);
      else words.add(entry);
    }
    if (words.size === 0 && phrases.length === 0) return cache?.list ?? null;

    const list = { words, phrases };
    cache = { list, at: Date.now() };
    return list;
  } catch {
    // On network/timeout error, use a previously cached list if we have one.
    return cache?.list ?? null;
  }
}

function isFlagged(text: string, list: WordList): boolean {
  const normalized = text.toLowerCase();
  // Whole-word match for single words avoids false positives like "assassin".
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.some((t) => list.words.has(t))) return true;
  // Multi-word entries are matched as substrings.
  return list.phrases.some((p) => normalized.includes(p));
}

export async function POST(request: Request) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Verify the caller is a signed-in app user (so this isn't an open endpoint).
  const token = (request.headers.get('authorization') ?? '').replace(
    /^Bearer\s+/i,
    '',
  );
  if (!token || !url || !anonKey) {
    return Response.json({ flagged: false });
  }
  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await authClient.auth.getUser(token);
  if (!user) {
    return Response.json({ flagged: false });
  }

  let text = '';
  try {
    const body = (await request.json()) as { text?: string };
    text = (body.text ?? '').trim();
  } catch {
    return Response.json({ flagged: false });
  }
  if (!text) return Response.json({ flagged: false });

  const list = await getList();
  if (!list) return Response.json({ flagged: false });

  return Response.json({ flagged: isFlagged(text, list) });
}
