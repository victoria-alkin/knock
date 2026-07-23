-- Block users. A block is mutual in effect: once either person blocks the
-- other, neither sees the other's posts, replies, comments, or listings,
-- neither can start or send DMs, and they drop out of each other's directory.

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

-- You manage only your own blocks.
drop policy if exists "read own blocks" on public.blocks;
create policy "read own blocks"
  on public.blocks for select
  to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "block as myself" on public.blocks;
create policy "block as myself"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

drop policy if exists "unblock own" on public.blocks;
create policy "unblock own"
  on public.blocks for delete
  to authenticated
  using (blocker_id = auth.uid());

-- True if the current user and `other` have a block in either direction.
-- Definer so it can see blocks filed by the other person too.
create or replace function public.is_blocked_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_id = other)
       or (blocker_id = other and blocked_id = auth.uid())
  );
$$;

-- The participant of a conversation who isn't the current user.
create or replace function public.conversation_other(conv uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case when user_a = auth.uid() then user_b else user_a end
  from public.conversations
  where id = conv;
$$;

-- ---------------------------------------------------------------------------
-- Re-scope content reads to hide blocked users (additive: a no-op when there
-- are no blocks).
-- ---------------------------------------------------------------------------

drop policy if exists "read posts in my buildings" on public.posts;
create policy "read posts in my buildings"
  on public.posts for select
  to authenticated
  using (
    public.is_member_of(building_id)
    and not public.is_blocked_with(author_id)
  );

drop policy if exists "read replies in my buildings" on public.replies;
create policy "read replies in my buildings"
  on public.replies for select
  to authenticated
  using (
    public.is_member_of(public.post_building_id(post_id))
    and not public.is_blocked_with(author_id)
  );

drop policy if exists "read event comments in my buildings" on public.event_comments;
create policy "read event comments in my buildings"
  on public.event_comments for select
  to authenticated
  using (
    public.is_member_of(public.event_building_id(event_id))
    and not public.is_blocked_with(author_id)
  );

drop policy if exists "read listings in my buildings" on public.listings;
create policy "read listings in my buildings"
  on public.listings for select
  to authenticated
  using (
    public.is_member_of(building_id)
    and not public.is_blocked_with(seller_id)
  );

drop policy if exists "read my conversations" on public.conversations;
create policy "read my conversations"
  on public.conversations for select
  to authenticated
  using (
    (user_a = auth.uid() or user_b = auth.uid())
    and not public.is_blocked_with(
      case when user_a = auth.uid() then user_b else user_a end
    )
  );

drop policy if exists "read messages in my conversations" on public.messages;
create policy "read messages in my conversations"
  on public.messages for select
  to authenticated
  using (
    public.is_conversation_participant(conversation_id)
    and not public.is_blocked_with(public.conversation_other(conversation_id))
  );

drop policy if exists "send messages as myself" on public.messages;
create policy "send messages as myself"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
    and not public.is_blocked_with(public.conversation_other(conversation_id))
  );

-- Refuse to start a conversation with someone you've blocked (or who blocked you).
create or replace function public.start_conversation(other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  cid uuid;
begin
  if me is null then
    raise exception 'authentication required';
  end if;
  if other = me then
    raise exception 'cannot message yourself';
  end if;
  if not public.shares_building_with(other) then
    raise exception 'you can only message residents of your building';
  end if;
  if public.is_blocked_with(other) then
    raise exception 'you cannot message this resident';
  end if;

  if me < other then a := me; b := other; else a := other; b := me; end if;

  insert into public.conversations (user_a, user_b)
  values (a, b)
  on conflict (user_a, user_b)
    do update set user_a = public.conversations.user_a
  returning id into cid;

  return cid;
end;
$$;

-- Hide blocked neighbors from the directory.
drop function if exists public.get_neighbor_directory();
create function public.get_neighbor_directory()
returns table (id uuid, display_name text, avatar_url text)
language sql
security definer
stable
set search_path = public
as $$
  select distinct
    p.id,
    coalesce(nullif(p.display_name, ''), 'Neighbor') as display_name,
    p.avatar_url
  from public.profiles p
  join public.building_members them on them.user_id = p.id
  join public.building_members me on me.building_id = them.building_id
  where me.user_id = auth.uid()
    and coalesce(p.in_directory, true) = true
    and not public.is_blocked_with(p.id)
  order by display_name;
$$;
grant execute on function public.get_neighbor_directory() to authenticated;
