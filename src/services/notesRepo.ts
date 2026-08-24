import type { Note } from '../types/note';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Persistencia de notas del diario en Supabase (tabla `notes`, ver
 * supabase/schema.sql). Mismo patrón jsonb + RLS que las apuestas.
 */

export async function fetchRemoteNotes(userId: string): Promise<Note[]> {
  if (!supabase || !isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('notes')
    .select('id, data')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Error al descargar notas: ${error.message}`);
  }
  return (data ?? []).map((row: { data: Note }) => row.data);
}

export async function syncNotesToCloud(
  userId: string,
  notes: Note[],
): Promise<void> {
  if (!supabase) return;

  if (notes.length === 0) {
    await supabase.from('notes').delete().eq('user_id', userId);
    return;
  }

  const rows = notes.map((note) => ({
    id: note.id,
    user_id: userId,
    data: note,
    updated_at: note.updatedAt,
  }));

  const { error: upsertError } = await supabase
    .from('notes')
    .upsert(rows, { onConflict: 'id' });
  if (upsertError) {
    throw new Error(`Error al sincronizar notas: ${upsertError.message}`);
  }

  // Remove rows deleted locally
  const { data: remoteIds, error: idsError } = await supabase
    .from('notes')
    .select('id')
    .eq('user_id', userId);
  if (idsError) {
    throw new Error(`Error al listar notas remotas: ${idsError.message}`);
  }
  if (!remoteIds) return;

  const localIds = new Set(notes.map((n) => n.id));
  const staleIds = remoteIds
    .map((r: { id: string }) => r.id)
    .filter((id: string) => !localIds.has(id));

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .in('id', staleIds)
      .eq('user_id', userId);
    if (deleteError) {
      throw new Error(`Error al eliminar notas remotas: ${deleteError.message}`);
    }
  }
}
