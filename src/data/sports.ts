import type { SportType } from '../types/bet';

/** Opciones de deporte para selects y filtros (fuente única). */
export const SPORT_OPTIONS: { value: SportType; label: string }[] = [
  { value: 'football', label: '⚽ Fútbol' },
  { value: 'basketball', label: '🏀 Baloncesto' },
  { value: 'tennis', label: '🎾 Tenis' },
  { value: 'baseball', label: '⚾ Béisbol' },
  { value: 'esports', label: '🎮 Esports' },
  { value: 'mma', label: '🥊 MMA / Boxeo' },
];

/** Labels descriptivos para el desglose de estadísticas. */
export const SPORT_ANALYTICS_LABELS: Record<SportType, string> = {
  football: '⚽ Fútbol (Champions & Ligas)',
  basketball: '🏀 Baloncesto (NBA / Euroliga)',
  tennis: '🎾 Tenis (ATP / WTA)',
  baseball: '⚾ Béisbol (MLB)',
  esports: '🎮 Esports (CS2 / LoL)',
  mma: '🥊 MMA / Boxeo (UFC)',
};

export function sportAnalyticsLabel(sport: SportType): string {
  return SPORT_ANALYTICS_LABELS[sport] ?? SPORT_ANALYTICS_LABELS.football;
}
