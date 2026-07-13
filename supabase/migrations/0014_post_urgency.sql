-- Optional urgency on posts (for help requests etc.). Shown as a badge.

alter table public.posts
  add column if not exists urgency text not null default 'normal'
  check (urgency in ('normal', 'this_week', 'asap'));
