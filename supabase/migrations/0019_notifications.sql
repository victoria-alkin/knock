-- In-app notifications. Rows are created by triggers (server-side) when someone
-- replies to your post, DMs you, or RSVPs to your event. Clients can only read
-- and mark their own as read.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_name text not null default 'A neighbor',
  type text not null,
  body text not null,
  post_id uuid references public.posts (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
-- Only triggers (SECURITY DEFINER) insert notifications.
revoke insert on public.notifications from anon, authenticated;

drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "update own notifications" on public.notifications;
create policy "update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "delete own notifications" on public.notifications;
create policy "delete own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Reply → notify the post's author.
create or replace function public.notify_on_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  actor text;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  if post_author is null or post_author = new.author_id then
    return new;
  end if;
  select display_name into actor from public.profiles where id = new.author_id;
  actor := coalesce(actor, 'A neighbor');
  insert into public.notifications (user_id, actor_name, type, body, post_id)
  values (post_author, actor, 'reply', actor || ' replied to your post', new.post_id);
  return new;
end;
$$;

drop trigger if exists reply_notify on public.replies;
create trigger reply_notify
  after insert on public.replies
  for each row execute function public.notify_on_reply();

-- Message → notify the other participant.
create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a uuid;
  b uuid;
  recipient uuid;
  actor text;
begin
  select user_a, user_b into a, b from public.conversations where id = new.conversation_id;
  recipient := case when new.sender_id = a then b else a end;
  if recipient is null or recipient = new.sender_id then
    return new;
  end if;
  select display_name into actor from public.profiles where id = new.sender_id;
  actor := coalesce(actor, 'A neighbor');
  insert into public.notifications (user_id, actor_name, type, body, conversation_id)
  values (recipient, actor, 'dm', actor || ' sent you a message', new.conversation_id);
  return new;
end;
$$;

drop trigger if exists message_notify on public.messages;
create trigger message_notify
  after insert on public.messages
  for each row execute function public.notify_on_message();

-- RSVP → notify the event's host.
create or replace function public.notify_on_rsvp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  host uuid;
  ename text;
  actor text;
  verb text;
begin
  select host_id, title into host, ename from public.events where id = new.event_id;
  if host is null or host = new.user_id then
    return new;
  end if;
  select display_name into actor from public.profiles where id = new.user_id;
  actor := coalesce(actor, 'A neighbor');
  verb := case new.status
    when 'going' then 'is going to'
    when 'maybe' then 'might go to'
    else 'can''t make'
  end;
  insert into public.notifications (user_id, actor_name, type, body, event_id)
  values (host, actor, 'rsvp', actor || ' ' || verb || ' ' || ename, new.event_id);
  return new;
end;
$$;

drop trigger if exists rsvp_notify on public.event_rsvps;
create trigger rsvp_notify
  after insert or update of status on public.event_rsvps
  for each row execute function public.notify_on_rsvp();
