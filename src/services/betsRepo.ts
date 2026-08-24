import type { Bet } from '../types/bet';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Persistencia de apuestas en Supabase (tabla `bets`, ver supabase/schema.sql).
 * Cada fila guarda la apuesta completa como jsonb; RLS limita el acceso
 * al propietario de la sesión.
 */

export function canSyncToCloud(): boolean {
  return isSupabaseConfigured && supabase !== null;
}

export async function fetchRemoteBets(userId: string): Promise<Bet[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('bets')
    .select('id, data')
    .eq('user_id', userId);

  if (error) {
    console.error('Error al descargar apuestas:', error.message);
    return [];
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
    console.error('Error al sincronizar apuestas:', upsertError.message);
    return;
  }

  // Remove rows deleted locally
  const { data: remoteIds, error: idsError } = await supabase
    .from('bets')
    .select('id')
    .eq('user_id', userId);
  if (idsError || !remoteIds) return;

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
      console.error('Error al eliminar apuestas remotas:', deleteError.message);
    }
  }
}
