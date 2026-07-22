-- Push notifications. Each device stores its Expo push token here, and every
-- new in-app notification fans out a push to the recipient's devices via the
-- Expo Push API (called with pg_net so the insert isn't blocked).
--
-- Dormant until the app runs as a development/production build: Expo Go can't
-- receive remote push (SDK 53+), so no tokens get stored while testing in it.

create extension if not exists pg_net;

create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx
  on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "read own push tokens" on public.push_tokens;
create policy "read own push tokens"
  on public.push_tokens for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "insert own push tokens" on public.push_tokens;
create policy "insert own push tokens"
  on public.push_tokens for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "update own push tokens" on public.push_tokens;
create policy "update own push tokens"
  on public.push_tokens for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "delete own push tokens" on public.push_tokens;
create policy "delete own push tokens"
  on public.push_tokens for delete
  to authenticated
  using (user_id = auth.uid());

-- Send a push to each of the recipient's devices when a notification is made.
create or replace function public.send_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
begin
  for t in
    select token from public.push_tokens where user_id = new.user_id
  loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Accept', 'application/json'
      ),
      body := jsonb_build_object(
        'to', t.token,
        'title', coalesce(nullif(new.actor_name, ''), 'Knock'),
        'body', new.body,
        'sound', 'default',
        'data', jsonb_build_object(
          'type', new.type,
          'postId', new.post_id,
          'conversationId', new.conversation_id,
          'eventId', new.event_id
        )
      )
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists push_on_notification on public.notifications;
create trigger push_on_notification
  after insert on public.notifications
  for each row execute function public.send_push_on_notification();
