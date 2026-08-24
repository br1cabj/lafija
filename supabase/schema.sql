-- LA FIJA - Esquema de persistencia de apuestas por usuario
-- Ejecutar en el SQL Editor de Supabase.

create table if not exists public.bets (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bets_user_id_idx on public.bets (user_id);

-- Diario de notas del tipster
create table if not exists public.notes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes (user_id);

alter table public.bets enable row level security;

drop policy if exists "Users manage own bets" on public.bets;
create policy "Users manage own bets"
  on public.bets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.notes enable row level security;

drop policy if exists "Users manage own notes" on public.notes;
create policy "Users manage own notes"
  on public.notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
