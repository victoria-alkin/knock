-- Allow replies to reply to other replies (threaded comments). A reply still
-- belongs to a post; parent_reply_id just links it under another reply.
-- Deleting a parent reply removes its child replies.

alter table public.replies
  add column if not exists parent_reply_id uuid
    references public.replies (id) on delete cascade;

create index if not exists replies_parent_idx
  on public.replies (parent_reply_id);
