-- Show each neighbor's chosen display name in the directory (not a derived
-- first name). Falls back to the first name only if no display name is set.

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
    coalesce(
      nullif(p.display_name, ''),
      nullif(split_part(coalesce(p.full_name, ''), ' ', 1), ''),
      'Neighbor'
    ) as display_name,
    p.avatar_url
  from public.profiles p
  join public.building_members them on them.user_id = p.id
  join public.building_members me on me.building_id = them.building_id
  where me.user_id = auth.uid()
    and coalesce(p.in_directory, true) = true
  order by display_name;
$$;

grant execute on function public.get_neighbor_directory() to authenticated;
