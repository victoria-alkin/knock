import { apiUrl } from './storage';
import { supabase } from './supabase';

export const MODERATION_MESSAGE =
  "This looks like it may go against Knock's community rules. Please revise it and try again.";

/**
 * Check user-entered text with the server moderation endpoint before creating
 * content. Returns { flagged: true } only when the content should be blocked.
 * Fails open (allows) on any error so moderation issues never break posting.
 */
export async function moderateText(
  text: string,
): Promise<{ flagged: boolean }> {
  const trimmed = text.trim();
  if (!trimmed) return { flagged: false };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { flagged: false };

  try {
    const res = await fetch(apiUrl('/api/moderate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ text: trimmed }),
    });
    if (!res.ok) return { flagged: false };
    const json = (await res.json()) as { flagged?: boolean };
    return { flagged: json.flagged === true };
  } catch {
    return { flagged: false };
  }
}
