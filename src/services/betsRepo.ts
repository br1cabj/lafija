import type { Bet } from '../types/bet';
import { supabase } from './supabase';

/**
 * Persistencia de apuestas en Supabase (tabla `bets`, ver supabase/schema.sql).
 * Cada fila guarda la apuesta completa como jsonb; RLS limita el acceso
 * al propietario de la sesión.
 */

export async function fetchRemoteBets(userId: string): Promise<Bet[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('bets')
    .select('id, data')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Error al descargar apuestas: ${error.message}`);
  }
  return (data ?? []).map((row: { data: Bet }) => row.data);
}

export async function syncBetsToCloud(
  userId: string,
  bets: Bet[],
): Promise<void> {
  if (!supabase || bets.length === 0) {
    if (supabase && bets.length === 0) {
      await supabase.from('bets').delete().eq('user_id', userId);
    }
    return;
  }

  const rows = bets.map((bet) => ({
    id: bet.id,
    user_id: userId,
    data: bet,
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await supabase
    .from('bets')
    .upsert(rows, { onConflict: 'id' });
  if (upsertError) {
    throw new Error(`Error al sincronizar apuestas: ${upsertError.message}`);
  }

  // Remove rows deleted locally
  const { data: remoteIds, error: idsError } = await supabase
    .from('bets')
    .select('id')
    .eq('user_id', userId);
  if (idsError) {
    throw new Error(`Error al listar apuestas remotas: ${idsError.message}`);
  }
  if (!remoteIds) return;

  const localIds = new Set(bets.map((b) => b.id));
  const staleIds = remoteIds
    .map((r: { id: string }) => r.id)
    .filter((id: string) => !localIds.has(id));

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('bets')
      .delete()
      .in('id', staleIds)
      .eq('user_id', userId);
    if (deleteError) {
      throw new Error(`Error al eliminar apuestas remotas: ${deleteError.message}`);
    }
  }
}
