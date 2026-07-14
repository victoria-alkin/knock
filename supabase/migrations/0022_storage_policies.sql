-- Consolidated Storage setup for all photo buckets.
-- Safe to run repeatedly: buckets use ON CONFLICT DO NOTHING and every policy
-- is dropped-if-exists before being recreated.
--
-- All buckets are PUBLIC (files load by their public URL, so no SELECT policy is
-- needed). Writes are restricted so a user can only create/replace/delete files
-- inside their own folder, where the path is "{user_id}/...".
-- Anonymous sign-in users carry the `authenticated` role, so these apply to them.

-- 1. Ensure the buckets exist and are public.
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('listing-photos', 'listing-photos', true),
  ('post-photos', 'post-photos', true),
  ('event-photos', 'event-photos', true)
on conflict (id) do update set public = true;

-- 2. One set of owner-only write policies per bucket.
do $$
declare
  b text;
begin
  foreach b in array array['avatars', 'listing-photos', 'post-photos', 'event-photos']
  loop
    -- INSERT
    execute format('drop policy if exists %I on storage.objects', b || ' insert own');
    execute format(
      'create policy %I on storage.objects for insert to authenticated '
      || 'with check (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)',
      b || ' insert own', b
    );

    -- UPDATE
    execute format('drop policy if exists %I on storage.objects', b || ' update own');
    execute format(
      'create policy %I on storage.objects for update to authenticated '
      || 'using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)',
      b || ' update own', b
    );

    -- DELETE
    execute format('drop policy if exists %I on storage.objects', b || ' delete own');
    execute format(
      'create policy %I on storage.objects for delete to authenticated '
      || 'using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)',
      b || ' delete own', b
    );
  end loop;
end $$;
