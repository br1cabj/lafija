import { detectApiCategory } from '../utils/liveSync';

/**
 * Mercados canónicos de LA FIJA. Única fuente de verdad para el
 * autocompletado del formulario. Agregar un mercado = agregar una línea.
 *
 * El flag de tracking NO se escribe a mano: `isMarketAuto()` lo deriva del
 * motor (detectApiCategory), así el diccionario jamás promete un ⚡ que el
 * parser no cumple. Los mercados por período o sin datos en fuentes gratis
 * quedan ✋ manuales de forma honesta. Texto libre siempre — esto sugiere,
 * no restringe.
 */
export interface KnownMarket {
  /** Nombre canónico tal como lo entiende el tracker. */
  label: string;
  /** Grupo para ordenar las sugerencias. */
  group: string;
}

export const KNOWN_MARKETS: readonly KnownMarket[] = [
  // Goles y resultado
  { label: 'Goles Totales', group: 'Goles' },
  { label: 'Goles - Local', group: 'Goles' },
  { label: 'Goles - Visitante', group: 'Goles' },
  { label: 'Ambos Anotan', group: 'Goles' },
  { label: 'Resultado Final', group: 'Goles' },
  { label: 'Doble Oportunidad', group: 'Goles' },
  { label: 'Total Goles Exacto', group: 'Goles' },
  { label: 'Hándicap Asiático', group: 'Goles' },
  { label: 'Hándicap Europeo', group: 'Goles' },

  // Córners
  { label: 'Córners Totales', group: 'Córners' },
  { label: 'Córners - Local', group: 'Córners' },
  { label: 'Córners - Visitante', group: 'Córners' },
  { label: 'Córners 1er Tiempo', group: 'Córners' },

  // Tarjetas
  { label: 'Tarjetas', group: 'Tarjetas' },
  { label: 'Tarjetas - Local', group: 'Tarjetas' },
  { label: 'Tarjetas - Visitante', group: 'Tarjetas' },
  { label: 'Tarjetas 1er Tiempo', group: 'Tarjetas' },

  // Tiros
  { label: 'Tiros al Arco', group: 'Tiros' },
  { label: 'Tiros al Arco - Local', group: 'Tiros' },
  { label: 'Tiros al Arco - Visitante', group: 'Tiros' },
  { label: 'Tiros Totales', group: 'Tiros' },

  // Faltas
  { label: 'Faltas', group: 'Faltas' },
  { label: 'Faltas - Local', group: 'Faltas' },

  // Jugador (siempre manual)
  { label: 'Props de Jugador', group: 'Jugador' },
];

/** true si el motor trackea este mercado con datos reales (⚡). */
export function isMarketAuto(label: string): boolean {
  return detectApiCategory(label, '') !== null;
}
