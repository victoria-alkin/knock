-- Remind "going" attendees when their event is starting soon (within the hour).

alter table public.events
  add column if not exists reminder_sent boolean not null default false;

-- Insert a one-time reminder notification for each going attendee of events
-- starting within the next hour, then mark those events reminded.
create or replace function public.remind_upcoming_events()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, actor_name, type, body, event_id)
  select r.user_id,
         'Reminder',
         'event_reminder',
         e.title || ' is starting soon',
         e.id
  from public.events e
  join public.event_rsvps r
    on r.event_id = e.id and r.status = 'going'
  where e.reminder_sent = false
    and e.starts_at > now()
    and e.starts_at <= now() + interval '1 hour';

  update public.events
  set reminder_sent = true
  where reminder_sent = false
    and starts_at > now()
    and starts_at <= now() + interval '1 hour';
end;
$$;

-- Schedule it to run every 15 minutes. Requires the pg_cron extension.
-- If the next two statements error, enable pg_cron in Supabase
-- (Database → Extensions → pg_cron), then re-run this file.
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'event-reminders') then
    perform cron.unschedule('event-reminders');
  end if;
  perform cron.schedule(
    'event-reminders',
    '*/15 * * * *',
    'select public.remind_upcoming_events();'
  );
end $$;
