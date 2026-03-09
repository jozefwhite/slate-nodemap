create table public.maps (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Untitled Map',
  seed_term text not null,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  path jsonb not null default '[]'::jsonb,
  view_mode text not null default 'graph' check (view_mode in ('graph', 'moodboard')),
  thumbnail_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.maps enable row level security;

-- RLS policies scoped to auth.uid()
create policy "Users can view own maps" on public.maps
  for select using (auth.uid() = user_id);

create policy "Users can insert own maps" on public.maps
  for insert with check (auth.uid() = user_id);

create policy "Users can update own maps" on public.maps
  for update using (auth.uid() = user_id);

create policy "Users can delete own maps" on public.maps
  for delete using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_maps_updated
  before update on public.maps
  for each row execute procedure public.handle_updated_at();
