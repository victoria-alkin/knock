import { supabase } from './supabase';

export type ReportTargetType =
  | 'post'
  | 'reply'
  | 'event_comment'
  | 'listing'
  | 'user'
  | 'dm';

export const REPORT_REASONS = [
  'Spam',
  'Harassment or bullying',
  'Inappropriate or offensive',
  'Scam or fraud',
  'Other',
] as const;

/**
 * File a report. Reports are write-only for residents (RLS), so a duplicate is
 * surfaced from the unique-constraint error rather than a pre-check.
 */
export async function submitReport(
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
  note?: string,
): Promise<{ error?: string; already?: boolean }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.' };

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason,
    note: note?.trim() || null,
  });

  if (error) {
    // 23505 = unique violation: they already reported this item.
    if (error.code === '23505') return { already: true };
    return { error: error.message };
  }
  return {};
}
