-- Allow event comments to reply to other event comments (threaded). A comment
-- still belongs to an event; parent_comment_id links it under another comment.
-- Deleting a parent comment removes its child replies.

alter table public.event_comments
  add column if not exists parent_comment_id uuid
    references public.event_comments (id) on delete cascade;

create index if not exists event_comments_parent_idx
  on public.event_comments (parent_comment_id);
