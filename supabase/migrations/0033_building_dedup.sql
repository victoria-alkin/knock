-- Combine buildings that are the same physical place whether a resident joined
-- by its name or by its street address. A building's name and its address are
-- separate Google places (different place ids), but Place Details returns the
-- same formatted address for both, so we match on a normalized address.

alter table public.buildings
  add column if not exists canonical_key text;

-- Normalize a formatted address into a stable match key:
-- lowercase, drop a trailing "USA"/"United States", and collapse anything
-- that isn't a letter or number into single spaces.
create or replace function public.normalize_address(addr text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(regexp_replace(
      regexp_replace(
        lower(coalesce(addr, '')),
        ',?\s*(usa|united states)\.?\s*$', '', 'g'
      ),
      '[^a-z0-9]+', ' ', 'g'
    )),
    ''
  );
$$;

update public.buildings
set canonical_key = public.normalize_address(address)
where canonical_key is null;

create index if not exists buildings_canonical_key_idx
  on public.buildings (canonical_key);

-- Join by matching the address first (so name and address resolve to one
-- building), then fall back to the Google place id / creating a new building.
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
  v_key text := public.normalize_address(p_address);
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  if p_place_id is null or length(trim(p_place_id)) = 0 then
    raise exception 'place id required';
  end if;

  -- Same address means same building (merges the name place and the address
  -- place). Oldest wins so everyone lands on the same one.
  if v_key is not null then
    select id into v_building_id
    from public.buildings
    where canonical_key = v_key
    order by created_at
    limit 1;
  end if;

  -- Otherwise reuse the exact Google place, or create the building.
  if v_building_id is null then
    insert into public.buildings (
      google_place_id, name, address, latitude, longitude, canonical_key
    )
    values (p_place_id, p_name, p_address, p_latitude, p_longitude, v_key)
    on conflict (google_place_id) do update set
      name = excluded.name,
      address = excluded.address,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      canonical_key = excluded.canonical_key
    returning id into v_building_id;
  end if;

  -- Prefer a real building name over a bare street address: if the stored name
  -- starts with a number and this join has a proper name, upgrade it.
  if p_name is not null and p_name !~ '^\s*\d' then
    update public.buildings
    set name = p_name
    where id = v_building_id and name ~ '^\s*\d';
  end if;

  insert into public.building_members (building_id, user_id, role)
  values (v_building_id, v_uid, 'resident')
  on conflict (building_id, user_id) do nothing;

  return v_building_id;
end;
$$;
