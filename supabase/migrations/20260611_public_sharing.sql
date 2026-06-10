-- Public sharing for maps
-- Run this in the Supabase SQL editor (or via supabase db push)

-- 1. Add the is_public flag
alter table public.maps
  add column if not exists is_public boolean not null default false;

-- 2. Allow anyone (including anonymous visitors) to read public maps.
--    Owner-scoped policies for insert/update/delete remain unchanged.
drop policy if exists "public_maps_are_readable" on public.maps;
create policy "public_maps_are_readable"
  on public.maps
  for select
  using (is_public = true);

-- 3. Index for the share-page lookup
create index if not exists maps_is_public_idx on public.maps (id) where is_public = true;
