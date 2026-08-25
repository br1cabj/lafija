/**
 * Mercados canónicos de LA FIJA. Única fuente de verdad para el
 * autocompletado del formulario: si el usuario elige uno de estos nombres,
 * detectApiCategory() lo trackea automático con datos reales sin ambigüedad.
 * El campo sigue siendo texto libre — el diccionario sugiere, no restringe.
 */
export const KNOWN_MARKETS: readonly string[] = [
  'Goles Totales',
  'Córners Totales',
  'Tarjetas',
  'Tiros al Arco',
  'Tiros Totales',
  'Faltas',
  'Props de Jugador',
  'Resultado Final',
  'Hándicap Asiático',
  'Ambos Anotan',
];
