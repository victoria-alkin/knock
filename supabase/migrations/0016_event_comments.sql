-- Comments on events. Access is scoped through the event's building.

create table if not exists public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists event_comments_event_idx
  on public.event_comments (event_id, created_at);

alter table public.event_comments enable row level security;

drop policy if exists "read event comments in my buildings" on public.event_comments;
create policy "read event comments in my buildings"
  on public.event_comments for select
  to authenticated
  using (public.is_member_of(public.event_building_id(event_id)));

drop policy if exists "comment on events in my buildings" on public.event_comments;
create policy "comment on events in my buildings"
  on public.event_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.is_member_of(public.event_building_id(event_id))
  );

drop policy if exists "delete own event comments" on public.event_comments;
create policy "delete own event comments"
  on public.event_comments for delete
  to authenticated
  using (author_id = auth.uid());
