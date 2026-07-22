-- Drop the unused expires_at column. The "expires" post option was removed, so
-- nothing writes or reads it anymore.

alter table public.posts drop column if exists expires_at;
