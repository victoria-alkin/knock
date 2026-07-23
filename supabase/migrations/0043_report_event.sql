-- Allow reporting events (in addition to posts, comments, listings, users, DMs).

alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in (
    'post', 'reply', 'event_comment', 'listing', 'user', 'dm', 'event'
  ));
