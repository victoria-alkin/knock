-- Content/user reports. Residents can file a report; the content stays visible
-- until an operator reviews reports in the Supabase dashboard. Reports are
-- private: only the service role can read them (no select policy for users).

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null
    check (target_type in ('post', 'reply', 'event_comment', 'listing', 'user', 'dm')),
  target_id uuid not null,
  reason text not null,
  note text,
  created_at timestamptz not null default now(),
  -- One report per person per item.
  unique (reporter_id, target_type, target_id)
);

create index if not exists reports_target_idx
  on public.reports (target_type, target_id);

alter table public.reports enable row level security;

-- File reports as yourself. There is intentionally no select/update/delete
-- policy, so reports are write-only for residents and readable only via the
-- service role (dashboard).
drop policy if exists "file own reports" on public.reports;
create policy "file own reports"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());
