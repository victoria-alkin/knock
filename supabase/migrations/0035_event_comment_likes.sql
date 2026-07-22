-- Likes on event comments. Scoped through the comment's event's building,
-- mirroring reply_likes: read within your building, like/unlike only yourself.

-- Resolve an event comment's building without tripping over RLS (definer).
create or replace function public.event_comment_building_id(p_comment_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select e.building_id
  from public.event_comments c
  join public.events e on e.id = c.event_id
  where c.id = p_comment_id;
$$;

create table if not exists public.event_comment_likes (
  comment_id uuid not null
    references public.event_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.event_comment_likes enable row level security;

drop policy if exists "read event comment likes in my buildings"
  on public.event_comment_likes;
create policy "read event comment likes in my buildings"
  on public.event_comment_likes for select
  to authenticated
  using (public.is_member_of(public.event_comment_building_id(comment_id)));

drop policy if exists "like event comment as myself"
  on public.event_comment_likes;
create policy "like event comment as myself"
  on public.event_comment_likes for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_member_of(public.event_comment_building_id(comment_id))
  );

drop policy if exists "unlike own event comment" on public.event_comment_likes;
create policy "unlike own event comment"
  on public.event_comment_likes for delete
  to authenticated
  using (user_id = auth.uid());
