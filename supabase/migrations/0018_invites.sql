-- Invite links. A resident gets a stable code for their building; anyone with
-- the code can read just that building's name + the inviter's name (via the
-- get_invite RPC) so the join page works before sign-up.

create table if not exists public.invites (
  code text primary key,
  building_id uuid not null references public.buildings (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (building_id, inviter_id)
);

-- Locked down: all access goes through the RPCs below.
alter table public.invites enable row level security;
revoke all on public.invites from anon, authenticated;

-- Get (or lazily create) the current user's invite code for their building.
create or replace function public.get_or_create_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  b uuid;
  c text;
begin
  if me is null then
    raise exception 'authentication required';
  end if;

  select building_id into b
  from public.building_members
  where user_id = me
  order by joined_at desc
  limit 1;

  if b is null then
    raise exception 'you are not in a building';
  end if;

  select code into c
  from public.invites
  where inviter_id = me and building_id = b;

  if c is null then
    c := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    insert into public.invites (code, building_id, inviter_id)
    values (c, b, me);
  end if;

  return c;
end;
$$;

revoke all on function public.get_or_create_invite() from public, anon;
grant execute on function public.get_or_create_invite() to authenticated;

-- Resolve an invite code to its building + inviter. Readable by anyone (the
-- code is the capability), so a logged-out invitee can see who invited them.
create or replace function public.get_invite(p_code text)
returns table (
  building_id uuid,
  building_name text,
  building_address text,
  place_id text,
  latitude double precision,
  longitude double precision,
  inviter_name text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    b.id,
    b.name,
    b.address,
    b.google_place_id,
    b.latitude,
    b.longitude,
    p.display_name
  from public.invites i
  join public.buildings b on b.id = i.building_id
  join public.profiles p on p.id = i.inviter_id
  where i.code = p_code;
$$;

revoke all on function public.get_invite(text) from public;
grant execute on function public.get_invite(text) to anon, authenticated;
