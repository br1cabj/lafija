import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create client if configured, otherwise fallback safely
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/** true si hay sesión de Supabase disponible para sincronizar datos. */
export function canSyncToCloud(): boolean {
  return isSupabaseConfigured && supabase !== null;
}
