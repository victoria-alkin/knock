-- Marketplace listing photos: an image_url column and a public bucket whose
-- writes are restricted to each user's own folder.

alter table public.listings
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

drop policy if exists "listing photo upload own" on storage.objects;
create policy "listing photo upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "listing photo update own" on storage.objects;
create policy "listing photo update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "listing photo delete own" on storage.objects;
create policy "listing photo delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
