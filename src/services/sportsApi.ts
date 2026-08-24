/**
 * Cliente del proxy serverless de datos deportivos.
 * La cuota de API-Football ya NO se consume en el flujo normal: los datos
 * en vivo y las estadísticas salen de /api/results con cascada de fuentes
 * gratuitas (ESPN -> SportScore -> API-Football solo como último recurso).
 *
 * Endpoints:
 *   GET /api/results?all=1                    -> todos los eventos en vivo
 *   GET /api/results?stats=<id>&league=<slug> -> estadísticas del partido
 *   GET /api/sports?teamsSearch=xxx           -> autocomplete de equipos
 */

export interface LiveFixture {
  /** ID numérico del proveedor (para cache interno). */
  fixtureId: number;
  /** ID con prefijo del fixture ("espn-1", "ss-slug", "af-2"): habilita stats. */
  statsRef?: string;
  provider: string;
  league: string;
  /** Slug de liga del proveedor (ej. "arg.1" en ESPN), requerido para stats. */
  leagueSlug?: string;
  minute: string;
  statusShort: string; // LIVE | HT | FT | SCHEDULED | POSTPONED
  homeTeam: string;
  awayTeam: string;
  homeTeamId?: number;
  awayTeamId?: number;
  homeScore: number;
  awayScore: number;
  startTime: string;
}

/**
 * Estadísticas granulares del partido. Las categorías son opcionales:
 * ausente = el proveedor no reporta ese dato (NO se asume cero).
 */
export interface LiveFixtureStats {
  fixtureId: number | string;
  homeTeam: string;
  awayTeam: string;
  corners?: { home: number; away: number; total: number };
  shotsOnTarget?: { home: number; away: number; total: number };
  cards?: { yellow: number; red: number; total: number };
  fouls?: { total: number };
}

export interface TeamSuggestion {
  id: number;
  name: string;
  country: string;
}

let apiAvailable: boolean | null = null;

/** Ping único al proxy para saber si hay datos reales disponibles. */
export async function probeLiveApi(): Promise<boolean> {
  if (apiAvailable !== null) return apiAvailable;
  try {
    const res = await fetch('/api/results?all=1');
    apiAvailable = res.ok;
  } catch {
    apiAvailable = false;
  }
  return apiAvailable;
}

/** Extrae el ID numérico de un id con prefijo ("sofa-123" -> 123). */
function numericId(prefixedId: string): number {
  const parsed = parseInt(prefixedId.split('-')[1] ?? '', 10);
  return isNaN(parsed) ? 0 : parsed;
}

interface ResultsResponse {
  source?: string;
  results?: Array<{
    id: string;
    league: string;
    leagueSlug?: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    minute: string;
    status: string;
    homeTeamId?: number;
    awayTeamId?: number;
  }>;
}

/** Todos los partidos en vivo ahora mismo. [] si el proxy no está disponible. */
export async function fetchLiveFixtures(): Promise<LiveFixture[]> {
  try {
    const res = await fetch('/api/results?all=1');
    if (!res.ok) return [];
    const json = (await res.json()) as ResultsResponse;
    const source = json.source ?? 'none';
    return (json.results ?? []).map((r) => ({
      fixtureId: numericId(r.id),
      // ESPN no publica stats granulares de futbol: solo af- y ss- piden stats
      statsRef: source === 'espn' ? undefined : r.id,
      provider: source,
      league: r.league,
      leagueSlug: r.leagueSlug,
      minute: r.minute,
      statusShort: r.status,
      homeTeam: r.homeTeam,
      awayTeam: r.awayTeam,
      homeTeamId: r.homeTeamId,
      awayTeamId: r.awayTeamId,
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      startTime: '',
    }));
  } catch (err) {
    console.warn('No se pudieron obtener partidos en vivo:', err);
    return [];
  }
}

/**
 * Estadísticas granulares de un partido. Usa el id con prefijo del fixture
 * para elegir la fuente serverless (ESPN/SportScore gratis, API-Football
 * con cuota vigilada). Devuelve null si no hay datos.
 */
export async function fetchFixtureStats(
  fixture: LiveFixture,
): Promise<LiveFixtureStats | null> {
  if (!fixture.statsRef) return null;
  const params = new URLSearchParams({
    stats: fixture.statsRef,
    ...(fixture.leagueSlug ? { league: fixture.leagueSlug } : {}),
  });
  try {
    const res = await fetch(`/api/results?${params.toString()}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { stats?: LiveFixtureStats | null };
    return json.stats ?? null;
  } catch (err) {
    console.warn(
      `Sin estadísticas para el evento ${fixture.statsRef}:`,
      err,
    );
    return null;
  }
}

/** Autocomplete de equipos por nombre (SofaScore gratis, fallback con cuota). */
export async function fetchTeamSuggestions(
  term: string,
): Promise<TeamSuggestion[]> {
  if (term.trim().length < 3) return [];
  try {
    const res = await fetch(
      `/api/sports?teamsSearch=${encodeURIComponent(term.trim())}`,
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { teams?: TeamSuggestion[] };
    return json.teams ?? [];
  } catch {
    return [];
  }
}
