-- Likes on replies. Scoped through the reply's post's building, mirroring
-- post_likes: read within your building, like/unlike only as yourself.

-- Resolve a reply's building without tripping over RLS (definer).
create or replace function public.reply_building_id(p_reply_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select p.building_id
  from public.replies r
  join public.posts p on p.id = r.post_id
  where r.id = p_reply_id;
$$;

create table if not exists public.reply_likes (
  reply_id uuid not null references public.replies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id)
);

alter table public.reply_likes enable row level security;

drop policy if exists "read reply likes in my buildings" on public.reply_likes;
create policy "read reply likes in my buildings"
  on public.reply_likes for select
  to authenticated
  using (public.is_member_of(public.reply_building_id(reply_id)));

drop policy if exists "like reply as myself" on public.reply_likes;
create policy "like reply as myself"
  on public.reply_likes for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_member_of(public.reply_building_id(reply_id))
  );

drop policy if exists "unlike own reply" on public.reply_likes;
create policy "unlike own reply"
  on public.reply_likes for delete
  to authenticated
  using (user_id = auth.uid());
