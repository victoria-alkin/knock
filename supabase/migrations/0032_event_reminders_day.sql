-- Add a day-before reminder (tracked separately from the hour-before one) and
-- include "maybe" RSVPers as well as "going". Self-contained: supersedes 0031.

alter table public.events
  add column if not exists reminder_sent boolean not null default false; -- hour-before
alter table public.events
  add column if not exists reminder_day_sent boolean not null default false; -- day-before

create or replace function public.remind_upcoming_events()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Day-before: the first time an event is within 24h (and still >1h away).
  insert into public.notifications (user_id, actor_name, type, body, event_id)
  select r.user_id, 'Reminder', 'event_reminder', e.title || ' is coming up', e.id
  from public.events e
  join public.event_rsvps r
    on r.event_id = e.id and r.status in ('going', 'maybe')
  where e.reminder_day_sent = false
    and e.starts_at > now() + interval '1 hour'
    and e.starts_at <= now() + interval '24 hours';

  update public.events
  set reminder_day_sent = true
  where reminder_day_sent = false
    and starts_at > now() + interval '1 hour'
    and starts_at <= now() + interval '24 hours';

  -- Starting soon: within the next hour.
  insert into public.notifications (user_id, actor_name, type, body, event_id)
  select r.user_id, 'Reminder', 'event_reminder', e.title || ' is starting soon', e.id
  from public.events e
  join public.event_rsvps r
    on r.event_id = e.id and r.status in ('going', 'maybe')
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

-- Make sure the every-15-minutes schedule exists (needs pg_cron; enable it in
-- Database → Extensions if the next statements error, then re-run this file).
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
