-- Knock initial schema: buildings, profiles, building memberships.
-- Run this in the Supabase SQL Editor (or via the Supabase CLI).
-- RLS is enabled on every table; access is scoped so residents only see data
-- for buildings they belong to.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique not null,
  name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.building_members (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'resident',
  verified boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (building_id, user_id)
);

create index if not exists building_members_user_idx
  on public.building_members (user_id);
create index if not exists building_members_building_idx
  on public.building_members (building_id);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid RLS recursion on membership)
-- ---------------------------------------------------------------------------

create or replace function public.is_member_of(b_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.building_members m
    where m.building_id = b_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.shares_building_with(target_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.building_members me
    join public.building_members them
      on me.building_id = them.building_id
    where me.user_id = auth.uid()
      and them.user_id = target_user
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.buildings enable row level security;
alter table public.profiles enable row level security;
alter table public.building_members enable row level security;

-- Buildings: any signed-in user may look up or register a building (building
-- rows are just place data; the private content lives in members/posts).
drop policy if exists "buildings are readable by authenticated" on public.buildings;
create policy "buildings are readable by authenticated"
  on public.buildings for select
  to authenticated
  using (true);

drop policy if exists "authenticated can add buildings" on public.buildings;
create policy "authenticated can add buildings"
  on public.buildings for insert
  to authenticated
  with check (true);

-- Profiles: you can see your own, and anyone who shares a building with you.
drop policy if exists "read own or shared-building profiles" on public.profiles;
create policy "read own or shared-building profiles"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.shares_building_with(id));

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Building members: you can see your own memberships and fellow residents of
-- buildings you belong to. You can only create/remove your own membership.
drop policy if exists "read memberships in my buildings" on public.building_members;
create policy "read memberships in my buildings"
  on public.building_members for select
  to authenticated
  using (user_id = auth.uid() or public.is_member_of(building_id));

drop policy if exists "join a building as myself" on public.building_members;
create policy "join a building as myself"
  on public.building_members for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "leave a building" on public.building_members;
create policy "leave a building"
  on public.building_members for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Keep profiles.updated_at fresh
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();
