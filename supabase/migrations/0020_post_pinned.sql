-- Pinned posts for the Home "Pinned" section. Pinning is an update on the post,
-- so the existing "update own posts" policy already restricts it to the author.

alter table public.posts
  add column if not exists pinned boolean not null default false;
