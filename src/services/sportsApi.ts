/**
 * Cliente del proxy serverless /api/sports/*.
 * La API key NUNCA viaja al navegador: las funciones de Vercel la inyectan
 * server-side desde la env var SPORTS_API_KEY.
 */

export interface LiveFixture {
  fixtureId: number;
  league: string;
  country: string;
  minute: string;
  statusShort: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  startTime: string;
}

export interface LiveFixtureStats {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  corners: { home: number; away: number; total: number };
  shotsOnTarget: { home: number; away: number; total: number };
  cards: { yellow: number; red: number; total: number };
  fouls: { total: number };
}

let apiAvailable: boolean | null = null;

/** Ping único al proxy para saber si hay datos reales disponibles. */
export async function probeLiveApi(): Promise<boolean> {
  if (apiAvailable !== null) return apiAvailable;
  try {
    const res = await fetch('/api/sports/live');
    // 404 = ruta no desplegada (dev con vite solo), 503 = sin key en servidor
    apiAvailable = res.ok || res.status === 200;
  } catch {
    apiAvailable = false;
  }
  return apiAvailable;
}

/** Todos los partidos en vivo ahora mismo. [] si el proxy no está disponible. */
export async function fetchLiveFixtures(): Promise<LiveFixture[]> {
  try {
    const res = await fetch('/api/sports/live');
    if (!res.ok) return [];
    const json = (await res.json()) as { fixtures?: LiveFixture[] };
    return json.fixtures ?? [];
  } catch (err) {
    console.warn('No se pudieron obtener partidos en vivo:', err);
    return [];
  }
}

/** Estadísticas granulares de un partido. null si no hay datos aún. */
export async function fetchFixtureStats(
  fixtureId: number,
): Promise<LiveFixtureStats | null> {
  try {
    const res = await fetch(`/api/sports/stats?fixture=${fixtureId}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { stats?: LiveFixtureStats | null };
    return json.stats ?? null;
  } catch (err) {
    console.warn(`Sin estadísticas para el partido ${fixtureId}:`, err);
    return null;
  }
}
