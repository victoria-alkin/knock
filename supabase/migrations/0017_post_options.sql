-- Additional create-post options from the spec: allow replies, allow DMs,
-- post anonymously, and an optional expiration.

alter table public.posts
  add column if not exists allow_replies boolean not null default true,
  add column if not exists allow_dms boolean not null default true,
  add column if not exists is_anonymous boolean not null default false,
  add column if not exists expires_at timestamptz;
