-- Hosts are automatically marked "going" to events they create, so they show
-- up in the going count and attendee list. Runs as definer to sidestep RLS on
-- the RSVP insert (the row is the host's own, so it stays owner-scoped).

create or replace function public.rsvp_host_going()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.event_rsvps (event_id, user_id, status)
  values (new.id, new.host_id, 'going')
  on conflict (event_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists host_auto_rsvp on public.events;
create trigger host_auto_rsvp
  after insert on public.events
  for each row execute function public.rsvp_host_going();

-- Backfill: mark existing hosts as going where they haven't RSVP'd already.
insert into public.event_rsvps (event_id, user_id, status)
select e.id, e.host_id, 'going'
from public.events e
on conflict (event_id, user_id) do nothing;
