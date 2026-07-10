-- Posts: messages residents write into a building's channels.
-- Scoped by RLS so only members of a building can read or write its posts, and
-- a member can only post as themselves.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  -- References profiles (not auth.users) so PostgREST can embed the author's
  -- display name. profiles.id == auth.users.id, so this still equals auth.uid().
  author_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists posts_building_channel_idx
  on public.posts (building_id, channel, created_at desc);

alter table public.posts enable row level security;

-- Read posts only in buildings you belong to.
drop policy if exists "read posts in my buildings" on public.posts;
create policy "read posts in my buildings"
  on public.posts for select
  to authenticated
  using (public.is_member_of(building_id));

-- Create posts as yourself, only in buildings you belong to.
drop policy if exists "post to my buildings" on public.posts;
create policy "post to my buildings"
  on public.posts for insert
  to authenticated
  with check (author_id = auth.uid() and public.is_member_of(building_id));

-- Edit and delete your own posts.
drop policy if exists "update own posts" on public.posts;
create policy "update own posts"
  on public.posts for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "delete own posts" on public.posts;
create policy "delete own posts"
  on public.posts for delete
  to authenticated
  using (author_id = auth.uid());
