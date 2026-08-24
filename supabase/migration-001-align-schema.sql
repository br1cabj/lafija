-- LA FIJA - Migración: alinea el esquema existente con supabase/schema.sql
-- Ejecutar en el SQL Editor de Supabase (es idempotente: se puede re-ejecutar).
--
-- Detectado por scripts/check-supabase.mjs:
--   - public.bets existe pero sin la columna `data`
--   - public.bets.id es uuid (la app usa ids de texto, ej. "bet-1756...")
--   - public.notes no existe

-- La app genera ids alfanuméricos ("bet-<timestamp>"): la columna debe ser text
alter table public.bets alter column id type text using id::text;

alter table public.bets add column if not exists data jsonb;

create table if not exists public.notes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bets_user_id_idx on public.bets (user_id);
create index if not exists notes_user_id_idx on public.notes (user_id);

-- RLS (se recrean para garantizar que estén aplicadas)
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
