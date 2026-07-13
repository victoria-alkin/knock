-- Photo attachments on posts: an image_url column and a public bucket whose
-- writes are restricted to each user's own folder.

alter table public.posts
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('post-photos', 'post-photos', true)
on conflict (id) do nothing;

drop policy if exists "post photo upload own" on storage.objects;
create policy "post photo upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "post photo update own" on storage.objects;
create policy "post photo update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "post photo delete own" on storage.objects;
create policy "post photo delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
