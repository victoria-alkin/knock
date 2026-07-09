-- Knock security hardening.
-- Clients must never be trusted to set privileged columns (role, verified) or
-- to tamper with building rows. We revoke direct writes and funnel building
-- joins through a controlled SECURITY DEFINER function.

-- ---------------------------------------------------------------------------
-- Remove direct client write access to buildings and memberships.
-- (SELECT and DELETE remain; DELETE is still gated by RLS to your own row.)
-- ---------------------------------------------------------------------------

revoke insert, update on public.buildings from anon, authenticated;
revoke insert, update on public.building_members from anon, authenticated;

-- The insert policies from 0001 are now moot (no INSERT privilege remains), but
-- drop them so the model is unambiguous: all joins go through join_building().
drop policy if exists "authenticated can add buildings" on public.buildings;
drop policy if exists "join a building as myself" on public.building_members;

-- ---------------------------------------------------------------------------
-- Controlled join: upsert the building and create the caller's membership.
-- role is forced to 'resident'; verified is left at its default (false) and can
-- never be set by the client. Runs as definer, so it bypasses the revokes above
-- but only ever writes rows tied to auth.uid().
-- ---------------------------------------------------------------------------

create or replace function public.join_building(
  p_place_id text,
  p_name text,
  p_address text,
  p_latitude double precision,
  p_longitude double precision
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_building_id uuid;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  if p_place_id is null or length(trim(p_place_id)) = 0 then
    raise exception 'place id required';
  end if;

  insert into public.buildings (
    google_place_id, name, address, latitude, longitude
  )
  values (p_place_id, p_name, p_address, p_latitude, p_longitude)
  on conflict (google_place_id)
    do update set
      name = excluded.name,
      address = excluded.address,
      latitude = excluded.latitude,
      longitude = excluded.longitude
  returning id into v_building_id;

  insert into public.building_members (building_id, user_id, role)
  values (v_building_id, v_uid, 'resident')
  on conflict (building_id, user_id) do nothing;

  return v_building_id;
end;
$$;

revoke all on function public.join_building(
  text, text, text, double precision, double precision
) from public, anon;

grant execute on function public.join_building(
  text, text, text, double precision, double precision
) to authenticated;
