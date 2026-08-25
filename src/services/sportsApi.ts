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
  /** Tiros TOTALES (incluyen los que van al arco). */
  shots?: { home: number; away: number; total: number };
  shotsOnTarget?: { home: number; away: number; total: number };
  cards?: { home: number; away: number; yellow: number; red: number; total: number };
  fouls?: { home: number; away: number; total: number };
}

export interface TeamSuggestion {
  id: number;
  name: string;
  country: string;
}

let apiAvailable: boolean | null = null;
let lastSource = 'none';

/** Fuente usada por el último fetchLiveFixtures ('espn'|'sportscore'|'apifootball'|'none'). */
export function getLastLiveSource(): string {
  return lastSource;
}

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
    if (!res.ok) {
      lastSource = 'none';
      return [];
    }
    const json = (await res.json()) as ResultsResponse;
    const source = json.source ?? 'none';
    lastSource = source;
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
    lastSource = 'none';
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

const TEAM_CACHE_KEY = 'lafija_team_search_cache_v1';
const TEAM_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Caché de sesión para búsquedas de equipos: tipear prefijos repetidos
 * ("riv", "rive", "river") no vuelve a golpear el server (y su cuota). */
function readTeamCache(term: string): TeamSuggestion[] | null {
  try {
    const raw = sessionStorage.getItem(TEAM_CACHE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, { ts: number; teams: TeamSuggestion[] }>;
    const hit = map[term];
    if (!hit || Date.now() - hit.ts > TEAM_CACHE_TTL_MS) return null;
    return hit.teams;
  } catch {
    return null;
  }
}

function writeTeamCache(term: string, teams: TeamSuggestion[]): void {
  try {
    const raw = sessionStorage.getItem(TEAM_CACHE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, { ts: number; teams: TeamSuggestion[] }>) : {};
    // Cap duro: maximo 40 terminos cacheados
    const entries = Object.entries(map);
    if (entries.length >= 40) entries.sort((a, b) => a[1].ts - b[1].ts).slice(0, entries.length - 39).forEach(([k]) => delete map[k]);
    map[term] = { ts: Date.now(), teams };
    sessionStorage.setItem(TEAM_CACHE_KEY, JSON.stringify(map));
  } catch {
    /* storage lleno o bloqueado: sin cache no pasa nada */
  }
}

/** Autocomplete de equipos por nombre (con caché de sesión). */
export async function fetchTeamSuggestions(
  term: string,
): Promise<TeamSuggestion[]> {
  const clean = term.trim();
  if (clean.length < 3) return [];

  const cached = readTeamCache(clean);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/sports?teamsSearch=${encodeURIComponent(clean)}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { teams?: TeamSuggestion[] };
    const teams = json.teams ?? [];
    writeTeamCache(clean, teams);
    return teams;
  } catch {
    return [];
  }
}
