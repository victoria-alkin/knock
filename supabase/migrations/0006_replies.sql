-- Replies to posts. Access is scoped through the parent post's building: you
-- can read/write a reply only if you belong to that post's building.

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists replies_post_idx
  on public.replies (post_id, created_at);

-- Resolve a post's building without tripping over posts' own RLS (definer).
create or replace function public.post_building_id(p_post_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select building_id from public.posts where id = p_post_id;
$$;

alter table public.replies enable row level security;

-- Read replies only for posts in buildings you belong to.
drop policy if exists "read replies in my buildings" on public.replies;
create policy "read replies in my buildings"
  on public.replies for select
  to authenticated
  using (public.is_member_of(public.post_building_id(post_id)));

-- Reply as yourself, only in buildings you belong to.
drop policy if exists "reply in my buildings" on public.replies;
create policy "reply in my buildings"
  on public.replies for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.is_member_of(public.post_building_id(post_id))
  );

-- Edit and delete your own replies.
drop policy if exists "update own replies" on public.replies;
create policy "update own replies"
  on public.replies for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "delete own replies" on public.replies;
create policy "delete own replies"
  on public.replies for delete
  to authenticated
  using (author_id = auth.uid());
