-- Events and RSVPs, scoped per building via RLS.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  location text,
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists events_building_time_idx
  on public.events (building_id, starts_at);

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('going', 'maybe', 'not_going')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists event_rsvps_event_idx
  on public.event_rsvps (event_id);

-- Resolve an event's building without tripping over events' own RLS.
create or replace function public.event_building_id(p_event_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select building_id from public.events where id = p_event_id;
$$;

alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;

-- Events: read within your buildings; create/edit/delete as the host.
drop policy if exists "read events in my buildings" on public.events;
create policy "read events in my buildings"
  on public.events for select
  to authenticated
  using (public.is_member_of(building_id));

drop policy if exists "host events in my buildings" on public.events;
create policy "host events in my buildings"
  on public.events for insert
  to authenticated
  with check (host_id = auth.uid() and public.is_member_of(building_id));

drop policy if exists "update own events" on public.events;
create policy "update own events"
  on public.events for update
  to authenticated
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

drop policy if exists "delete own events" on public.events;
create policy "delete own events"
  on public.events for delete
  to authenticated
  using (host_id = auth.uid());

-- RSVPs: read within the event's building; set/change/remove only your own.
drop policy if exists "read rsvps in my buildings" on public.event_rsvps;
create policy "read rsvps in my buildings"
  on public.event_rsvps for select
  to authenticated
  using (public.is_member_of(public.event_building_id(event_id)));

drop policy if exists "rsvp as myself" on public.event_rsvps;
create policy "rsvp as myself"
  on public.event_rsvps for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_member_of(public.event_building_id(event_id))
  );

drop policy if exists "update own rsvp" on public.event_rsvps;
create policy "update own rsvp"
  on public.event_rsvps for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "delete own rsvp" on public.event_rsvps;
create policy "delete own rsvp"
  on public.event_rsvps for delete
  to authenticated
  using (user_id = auth.uid());
