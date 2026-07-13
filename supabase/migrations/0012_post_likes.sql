-- Likes on posts. Scoped through the post's building, like/unlike only yourself.

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists "read likes in my buildings" on public.post_likes;
create policy "read likes in my buildings"
  on public.post_likes for select
  to authenticated
  using (public.is_member_of(public.post_building_id(post_id)));

drop policy if exists "like as myself" on public.post_likes;
create policy "like as myself"
  on public.post_likes for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_member_of(public.post_building_id(post_id))
  );

drop policy if exists "unlike own" on public.post_likes;
create policy "unlike own"
  on public.post_likes for delete
  to authenticated
  using (user_id = auth.uid());
