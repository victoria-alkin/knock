-- Track who triggered a notification so the client can show their avatar.
-- Redefines the three notify triggers to also record actor_id.

alter table public.notifications
  add column if not exists actor_id uuid references public.profiles (id) on delete set null;

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
  insert into public.notifications (user_id, actor_id, actor_name, type, body, post_id)
  values (post_author, new.author_id, actor, 'reply', actor || ' replied to your post', new.post_id);
  return new;
end;
$$;

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
  insert into public.notifications (user_id, actor_id, actor_name, type, body, conversation_id)
  values (recipient, new.sender_id, actor, 'dm', actor || ' sent you a message', new.conversation_id);
  return new;
end;
$$;

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
  insert into public.notifications (user_id, actor_id, actor_name, type, body, event_id)
  values (host, new.user_id, actor, 'rsvp', actor || ' ' || verb || ' ' || ename, new.event_id);
  return new;
end;
$$;
