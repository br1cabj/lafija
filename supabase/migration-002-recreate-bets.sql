-- LA FIJA - Migración 002: recrea public.bets con el esquema correcto
--
-- ⚠️ SOLO EJECUTAR SI LA TABLA ESTÁ VACÍA (verificable con npm run check:supabase,
--    sección 7 del reporte). Elimina cualquier dato existente en bets.
--
-- Motivo (detectado por scripts/check-supabase.mjs): la tabla heredada tiene
-- columnas NOT NULL de un esquema anterior (title, etc.) que la app no usa,
-- lo que impide insertar. El esquema real de la app es: id + user_id + data(jsonb).

drop table if exists public.bets;

create table public.bets (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bets_user_id_idx on public.bets (user_id);

alter table public.bets enable row level security;

drop policy if exists "Users manage own bets" on public.bets;
create policy "Users manage own bets"
  on public.bets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
