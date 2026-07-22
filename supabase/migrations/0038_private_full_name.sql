-- Make full names (first + last) truly private. full_name lived on `profiles`,
-- which fellow building members can read via RLS, leaking last names. Move it to
-- the owner-only private_contact table, alongside phone. Only display_name and
-- avatar_url stay readable by building members (for post/comment authorship and
-- the opt-in neighbor directory).

alter table public.private_contact
  add column if not exists full_name text;

-- Carry over existing full names.
insert into public.private_contact (id, full_name)
  select id, full_name from public.profiles where full_name is not null
  on conflict (id) do update set full_name = excluded.full_name;

-- The directory RPC referenced profiles.full_name as a first-name fallback.
-- Redefine it to show display_name only (must happen before dropping the
-- column, or the function would reference a missing column).
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
  order by display_name;
$$;
grant execute on function public.get_neighbor_directory() to authenticated;

-- Remove full_name from the shared-readable profiles table.
alter table public.profiles drop column if exists full_name;
