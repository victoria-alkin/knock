-- Add an (unverified) phone number to profiles.
-- Verification comes later; for now this is a plain contact field the resident
-- enters during profile setup. It stays covered by the existing profiles RLS
-- (readable only by the owner and fellow residents of a shared building).

alter table public.profiles
  add column if not exists phone text;
