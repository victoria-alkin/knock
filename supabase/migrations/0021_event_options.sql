-- Create Event settings from the mockup: capacity, RSVP required, allow comments.

alter table public.events
  add column if not exists capacity integer,
  add column if not exists rsvp_required boolean not null default false,
  add column if not exists allow_comments boolean not null default true;

-- Enforce capacity server-side: block a "going" RSVP when the event is full.
create or replace function public.enforce_event_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap integer;
  going_count integer;
begin
  if new.status <> 'going' then
    return new;
  end if;

  select capacity into cap from public.events where id = new.event_id;
  if cap is null then
    return new;
  end if;

  select count(*) into going_count
  from public.event_rsvps
  where event_id = new.event_id
    and status = 'going'
    and user_id <> new.user_id;

  if going_count >= cap then
    raise exception 'This event is full';
  end if;

  return new;
end;
$$;

drop trigger if exists event_capacity on public.event_rsvps;
create trigger event_capacity
  before insert or update on public.event_rsvps
  for each row execute function public.enforce_event_capacity();

-- Enforce "allow comments" at the database, not just the UI.
create or replace function public.event_allows_comments(p_event_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(allow_comments, true) from public.events where id = p_event_id;
$$;

drop policy if exists "comment on events in my buildings" on public.event_comments;
create policy "comment on events in my buildings"
  on public.event_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.is_member_of(public.event_building_id(event_id))
    and public.event_allows_comments(event_id)
  );
