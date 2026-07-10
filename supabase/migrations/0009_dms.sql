-- Direct messages: private 1:1 conversations between residents.
-- You can only start a conversation with someone in your building, and only
-- read/write a conversation you're a participant in.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- canonical ordering dedupes a pair to a single row
  constraint conversations_ordered check (user_a < user_b),
  unique (user_a, user_b)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

-- Am I a participant in this conversation? (definer, bypasses RLS.)
create or replace function public.is_conversation_participant(c_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = c_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
  );
$$;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Conversations are read-only to participants; creation goes through the RPC.
revoke insert, update, delete on public.conversations from anon, authenticated;

drop policy if exists "read my conversations" on public.conversations;
create policy "read my conversations"
  on public.conversations for select
  to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

-- Messages: read/write only within conversations you're part of.
drop policy if exists "read messages in my conversations" on public.messages;
create policy "read messages in my conversations"
  on public.messages for select
  to authenticated
  using (public.is_conversation_participant(conversation_id));

drop policy if exists "send messages as myself" on public.messages;
create policy "send messages as myself"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
  );

-- Start (or fetch) a conversation with someone in your building. Canonicalizes
-- the pair and only allows it between fellow residents.
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

  if me < other then a := me; b := other; else a := other; b := me; end if;

  insert into public.conversations (user_a, user_b)
  values (a, b)
  on conflict (user_a, user_b)
    do update set user_a = public.conversations.user_a
  returning id into cid;

  return cid;
end;
$$;

revoke all on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;
