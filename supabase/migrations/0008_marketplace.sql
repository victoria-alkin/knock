-- Marketplace listings, scoped per building via RLS.

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('for_sale', 'giving_away', 'looking_for')),
  title text not null check (char_length(title) between 1 and 200),
  description text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  status text not null default 'available' check (status in ('available', 'sold')),
  created_at timestamptz not null default now()
);

create index if not exists listings_building_idx
  on public.listings (building_id, created_at desc);

alter table public.listings enable row level security;

-- Read listings only in buildings you belong to.
drop policy if exists "read listings in my buildings" on public.listings;
create policy "read listings in my buildings"
  on public.listings for select
  to authenticated
  using (public.is_member_of(building_id));

-- Create listings as yourself, only in buildings you belong to.
drop policy if exists "list in my buildings" on public.listings;
create policy "list in my buildings"
  on public.listings for insert
  to authenticated
  with check (seller_id = auth.uid() and public.is_member_of(building_id));

-- Edit and delete your own listings.
drop policy if exists "update own listings" on public.listings;
create policy "update own listings"
  on public.listings for update
  to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

drop policy if exists "delete own listings" on public.listings;
create policy "delete own listings"
  on public.listings for delete
  to authenticated
  using (seller_id = auth.uid());
