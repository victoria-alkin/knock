-- Make phone numbers truly private. Previously phone lived on `profiles`, which
-- fellow building members can read via RLS. Move it to a table only its owner
-- can ever read or write.

create table if not exists public.private_contact (
  id uuid primary key references public.profiles (id) on delete cascade,
  phone text
);

-- Carry over any phone numbers already stored on profiles.
insert into public.private_contact (id, phone)
  select id, phone from public.profiles where phone is not null
  on conflict (id) do nothing;

alter table public.private_contact enable row level security;

-- Only the owner can see or change their contact info. No shared-building read.
drop policy if exists "read own contact" on public.private_contact;
create policy "read own contact"
  on public.private_contact for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "insert own contact" on public.private_contact;
create policy "insert own contact"
  on public.private_contact for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "update own contact" on public.private_contact;
create policy "update own contact"
  on public.private_contact for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Remove phone from the shared-readable profiles table.
alter table public.profiles drop column if exists phone;
