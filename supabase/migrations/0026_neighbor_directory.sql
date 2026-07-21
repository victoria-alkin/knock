-- Neighbor directory: an opt-in list of neighbors (first names only).

-- Opt-in flag, defaults to listed.
alter table public.profiles
  add column if not exists in_directory boolean not null default true;

-- Returns opted-in neighbors who share a building with the caller. Only the
-- first name + avatar are exposed here (never last names, phone, or units), and
-- because it's SECURITY DEFINER the last name never leaves the database.
create or replace function public.get_neighbor_directory()
returns table (id uuid, first_name text, avatar_url text)
language sql
security definer
stable
set search_path = public
as $$
  select distinct
    p.id,
    coalesce(
      nullif(
        split_part(coalesce(nullif(p.full_name, ''), p.display_name, ''), ' ', 1),
        ''
      ),
      'Neighbor'
    ) as first_name,
    p.avatar_url
  from public.profiles p
  join public.building_members them on them.user_id = p.id
  join public.building_members me on me.building_id = them.building_id
  where me.user_id = auth.uid()
    and coalesce(p.in_directory, true) = true
  order by first_name;
$$;

grant execute on function public.get_neighbor_directory() to authenticated;
