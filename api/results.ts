/**
 * GET /api/results?teams=Real Madrid|Inter Miami
 *   -> Partidos en vivo/programados que coincidan con los equipos recibidos
 *      (fragmentos separados por "|"). Cache 45s.
 * GET /api/results?all=1
 *   -> Todos los eventos en vivo sin filtrar (para matching del sync).
 * GET /api/results?stats=<id-con-prefijo>
 *   -> Estadisticas granulares (córners/tarjetas/remates/faltas). El prefijo
 *      del id elige la fuente: ss- (SportScore, gratis) o af- (API-Football,
 *      consume cuota vigilada). ESPN no publica stats de futbol: null.
 *
 * Fuente de datos SIN consumir la cuota de API-Football: adaptador con dos
 * proveedores gratuitos (ESPN scoreboard / SportScore). El proveedor primario
 * se elige con la env var RESULTS_PROVIDER (espn|sportscore, default espn).
 * Fallback en cascada: primario -> secundario -> API-Football (limitada por
 * un guardian diario: max ~80 requests/dia, ver quotaAvailable()).
 *
 * Funcion unica y autocontenida: sin imports relativos (build de Vercel).
 */

const CACHE_TTL_MS = 45_000;

interface CacheEntry {
  ts: number;
  data: LiveResult[];
}

// Cache del listado completo por proveedor: se filtra por equipo por request,
// asi N usuarios con partidos distintos comparten 1 request upstream.
const cache = new Map<string, CacheEntry>();

// Helpers compartidos con api/sports.ts (cuota, JSON+edge cache, guards).
// El edge cache default de _lib (s-maxage=45, swr=60) es el de este endpoint.
import {
  consumeQuota,
  fetchJson,
  getApiKey,
  isReadMethodOr405,
  quotaAvailable,
  sendJson as json,
  type ApiReq,
  type ApiRes,
} from './_lib.js';
// ÚNICA fuente de verdad del shape de stats granulares (compartida con el
// cliente). Import solo de tipos: se borra al transpilar, sin bundle extra.
import type { LiveFixtureStats } from '../src/services/sportsApi.js';

// ---- Guardian de cuota diaria para API-Football: en ./_lib -----------------

export interface LiveResult {
  id: string;
  league: string;
  /** Slug de liga del proveedor (ej. "arg.1" en ESPN), para pedir stats. */
  leagueSlug?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: string;
  status: string; // LIVE | HT | FT | SCHEDULED | POSTPONED
  homeTeamId?: number;
  awayTeamId?: number;
}

type ProviderName = 'espn' | 'sportscore' | 'apifootball';

function getPrimaryProvider(): 'espn' | 'sportscore' {
  const raw = (process.env.RESULTS_PROVIDER ?? '').trim().toLowerCase();
  return raw === 'sportscore' ? 'sportscore' : 'espn';
}

/** Normaliza nombres de equipos para matching difuso (sin acentos/punct). */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function teamMatches(teamName: string, fragments: string[]): boolean {
  const norm = normalizeName(teamName);
  if (!norm) return false;
  return fragments.some((f) => {
    const nf = normalizeName(f);
    return nf !== '' && (norm.includes(nf) || nf.includes(norm));
  });
}

async function cachedProvider(
  key: string,
  ttlMs: number,
  loader: () => Promise<LiveResult[]>,
): Promise<LiveResult[]> {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.ts < ttlMs) return hit.data;
  const data = await loader();
  cache.set(key, { ts: now, data });
  if (cache.size > 10) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return data;
}

// ---- Proveedor: ESPN scoreboard (gratuito, sin key) ------------------------

const ESPN_LEAGUES = [
  'arg.1',
  'eng.1',
  'eng.2',
  'esp.1',
  'ita.1',
  'ger.1',
  'fra.1',
  'por.1',
  'ned.1',
  'bra.1',
  'mex.1',
  'usa.1',
  'uefa.champions',
  'uefa.europa',
  'conmebol.libertadores',
  'conmebol.sudamericana',
];

interface EspnEvent {
  id?: string;
  competitions?: Array<{
    competitors?: Array<{
      homeAway?: string;
      team?: { displayName?: string; id?: string };
      score?: string;
    }>;
    status?: {
      displayClock?: string;
      type?: { state?: string; description?: string };
    };
  }>;
  leagues?: Array<{ name?: string }>;
}

function mapEspnStatus(state: string | undefined, description: string | undefined): string {
  if (state === 'postponed') return 'POSTPONED';
  if (state === 'post') return 'FT';
  if (state === 'in') {
    if (description && /halftime/i.test(description)) return 'HT';
    return 'LIVE';
  }
  return 'SCHEDULED';
}

async function fetchEspn(): Promise<LiveResult[]> {
  const responses = await Promise.allSettled(
    ESPN_LEAGUES.map((league) =>
      fetchJson(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`,
      ).then((json) => ({ json, league })),
    ),
  );

  const results: LiveResult[] = [];
  for (const settled of responses) {
    if (settled.status !== 'fulfilled') continue;
    const { json, league } = settled.value as {
      json: { events?: EspnEvent[] };
      league: string;
    };
    for (const event of json.events ?? []) {
      const comp = event.competitions?.[0];
      if (!comp) continue;
      const home = comp.competitors?.find((c) => c.homeAway === 'home');
      const away = comp.competitors?.find((c) => c.homeAway === 'away');
      if (!home?.team?.displayName || !away?.team?.displayName) continue;
      results.push({
        id: `espn-${event.id ?? `${home.team.displayName}-${away.team.displayName}`}`,
        league: event.leagues?.[0]?.name ?? league,
        leagueSlug: league,
        homeTeam: home.team.displayName,
        awayTeam: away.team.displayName,
        homeScore: parseInt(home.score ?? '0', 10) || 0,
        awayScore: parseInt(away.score ?? '0', 10) || 0,
        minute: comp.status?.displayClock ?? '',
        status: mapEspnStatus(
          comp.status?.type?.state,
          comp.status?.type?.description,
        ),
        homeTeamId: home.team.id ? parseInt(home.team.id, 10) : undefined,
        awayTeamId: away.team.id ? parseInt(away.team.id, 10) : undefined,
      });
    }
  }
  return results;
}

// ---- Proveedor: SportScore (gratuito, sin key, cobertura amplia) -----------

interface SportScoreMatch {
  home?: string;
  away?: string;
  home_score?: string | number;
  away_score?: string | number;
  status?: string; // live | finished | upcoming
  status_text?: string;
  competition?: string;
  url?: string; // /football/match/<slug>/
  live_minute?: number | null;
}

/** Extrae el slug de un url tipo /football/match/x-vs-y/. */
function sportScoreSlug(url: string | undefined): string {
  const m = /\/football\/match\/([^/]+)\/?/.exec(url ?? '');
  return m?.[1] ?? '';
}

function mapSportScoreStatus(status: string | undefined): string {
  switch (status) {
    case 'live':
      return 'LIVE';
    case 'finished':
      return 'FT';
    case 'postponed':
      return 'POSTPONED';
    default:
      return 'SCHEDULED';
  }
}

async function fetchSportScore(): Promise<LiveResult[]> {
  const payload = (await fetchJson(
    'https://sportscore.com/api/widget/matches/?sport=football&limit=50',
  )) as { matches?: SportScoreMatch[] };

  return (payload.matches ?? [])
    .filter(
      (m) =>
        m.status === 'live' &&
        Boolean(m.home && m.away) &&
        sportScoreSlug(m.url) !== '',
    )
    .map((m) => ({
      id: `ss-${sportScoreSlug(m.url)}`,
      league: m.competition ?? '',
      homeTeam: m.home ?? '',
      awayTeam: m.away ?? '',
      homeScore: parseInt(String(m.home_score ?? '0'), 10) || 0,
      awayScore: parseInt(String(m.away_score ?? '0'), 10) || 0,
      minute:
        m.live_minute != null ? `${m.live_minute}'` : (m.status_text ?? ''),
      status: mapSportScoreStatus(m.status),
    }));
}

// ---- Fallback: API-Football (consume cuota; solo si los otros fallan) ------

async function fetchApiFootball(): Promise<LiveResult[]> {
  const key = getApiKey();
  if (!key) return [];
  // Guardián: sin cuota diaria disponible, esta ruta de la cascada se saltea
  if (!quotaAvailable()) {
    console.warn('[api/results] API-Football omitida: cuota diaria agotada');
    return [];
  }

  consumeQuota('[api/results]');
  const res = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
    headers: { 'x-apisports-key': key },
  });
  if (!res.ok) throw new Error(`API-Sports HTTP ${res.status}`);
  const payload = (await res.json()) as {
    response?: Array<{
      fixture?: { id?: number; status?: { short?: string; elapsed?: number | null } };
      league?: { name?: string };
      teams?: {
        home?: { name?: string; id?: number };
        away?: { name?: string; id?: number };
      };
      goals?: { home?: number | null; away?: number | null };
    }>;
  };

  return (payload.response ?? [])
    .filter((f) => f.teams?.home?.name && f.teams?.away?.name)
    .map((f) => ({
      id: `af-${f.fixture?.id ?? 'x'}`,
      league: f.league?.name ?? '',
      homeTeam: f.teams?.home?.name ?? '',
      awayTeam: f.teams?.away?.name ?? '',
      homeScore: f.goals?.home ?? 0,
      awayScore: f.goals?.away ?? 0,
      minute:
        f.fixture?.status?.elapsed != null ? `${f.fixture.status.elapsed}'` : '',
      status:
        f.fixture?.status?.short === 'HT'
          ? 'HT'
          : ['FT', 'AET', 'PEN'].includes(f.fixture?.status?.short ?? '')
            ? 'FT'
            : ['PST', 'CANC', 'ABD', 'SUSP'].includes(f.fixture?.status?.short ?? '')
              ? 'POSTPONED'
              : f.fixture?.status?.short === 'NS'
                ? 'SCHEDULED'
                : 'LIVE',
      homeTeamId: f.teams?.home?.id,
      awayTeamId: f.teams?.away?.id,
    }));
}

// ---- Orquestación con fallback en cascada ----------------------------------

async function getAllResults(): Promise<{ source: string; results: LiveResult[] }> {
  const primary = getPrimaryProvider();
  const freeFallback = primary === 'espn' ? 'sportscore' : 'espn';

  const loaders: Record<ProviderName, () => Promise<LiveResult[]>> = {
    espn: () => cachedProvider('espn', CACHE_TTL_MS, fetchEspn),
    sportscore: () => cachedProvider('sportscore', CACHE_TTL_MS, fetchSportScore),
    apifootball: () => cachedProvider('apifootball', CACHE_TTL_MS, fetchApiFootball),
  };

  // Cascada: dos fuentes gratis primero, API-Football (cuota) al final
  const order: ProviderName[] = [primary, freeFallback, 'apifootball'];
  for (const provider of order) {
    try {
      const results = await loaders[provider]();
      if (results.length > 0) return { source: provider, results };
    } catch (err) {
      console.warn(`[api/results] proveedor ${provider} fallo:`, err);
    }
  }
  return { source: 'none', results: [] };
}

// ---- Handler ----------------------------------------------------------------

/**
 * Las categorías de stats son opcionales: solo se incluyen cuando el
 * proveedor realmente las reporta. El cliente trata la ausencia como
 * "dato desconocido" y NO auto-marca condiciones con ceros inventados.
 */
// El shape de stats vive en src/services/sportsApi.ts (LiveFixtureStats):
// cliente y serverless comparten definición para no desincronizarse jamás.

function pair(
  home: number,
  away: number,
): { home: number; away: number; total: number } {
  return { home, away, total: home + away };
}

// ---- Stats vía SportScore match detail (gratuito) ---------------------------

interface SportScoreDetailResponse {
  match?: {
    incidents?: Array<{ type?: string; side?: string }>;
    /** Formato no documentado: parseo defensivo. */
    stats?: Array<Record<string, unknown>>;
    home_team?: string;
    away_team?: string;
  };
}

async function handleSportScoreStats(
  res: ApiRes,
  slug: string,
): Promise<void> {
  const payload = (await fetchJson(
    `https://sportscore.com/api/widget/match/?sport=football&slug=${encodeURIComponent(slug)}`,
  )) as SportScoreDetailResponse;

  const match = payload.match;
  if (!match) {
    json(res, 200, { stats: null });
    return;
  }

  // Tarjetas: contadas desde incidents (formato estable)
  const incidents = match.incidents ?? [];
  const countCards = (side: string, rx: RegExp): number =>
    incidents.filter((i) => i.side === side && rx.test(i.type ?? '')).length;
  const yellowH = countCards('home', /yellow/i);
  const yellowA = countCards('away', /yellow/i);
  const redH = countCards('home', /red/i);
  const redA = countCards('away', /red/i);

  // Córners/tiros/faltas: del array stats si viene poblado
  const rows = Array.isArray(match.stats) ? match.stats : [];
  const pick = (
    rx: RegExp,
    excludeRx?: RegExp,
  ): { home: number; away: number } | null => {
    for (const s of rows) {
      const name = String(s.name ?? '');
      if (!rx.test(name)) continue;
      if (excludeRx && excludeRx.test(name)) continue;
      const h = parseInt(String(s.home ?? ''), 10);
      const a = parseInt(String(s.away ?? ''), 10);
      if (!isNaN(h) && !isNaN(a)) return { home: h, away: a };
    }
    return null;
  };

  const corners = pick(/corner/i);
  const sot = pick(/on target|sot|on goal/i);
  // Tiros totales: cualquier fila de shots que NO sea de arco
  const shotsTotal = pick(/shot|remate/i, /on target|sot|on goal/i);
  const fouls = pick(/foul/i);

  const cardsTotal = yellowH + yellowA + redH + redA;
  if (
    corners === null &&
    sot === null &&
    shotsTotal === null &&
    fouls === null &&
    cardsTotal === 0
  ) {
    json(res, 200, { stats: null });
    return;
  }

  const stats: LiveFixtureStats = {
    fixtureId: slug,
    homeTeam: match.home_team ?? '',
    awayTeam: match.away_team ?? '',
  };
  if (corners !== null) stats.corners = pair(corners.home, corners.away);
  if (shotsTotal !== null)
    stats.shots = { home: shotsTotal.home, away: shotsTotal.away, total: shotsTotal.home + shotsTotal.away };
  if (sot !== null) stats.shotsOnTarget = pair(sot.home, sot.away);
  if (cardsTotal > 0) {
    const cardsHome = yellowH + redH;
    const cardsAway = yellowA + redA;
    stats.cards = {
      home: cardsHome,
      away: cardsAway,
      yellow: yellowH + yellowA,
      red: redH + redA,
      total: cardsTotal,
    };
  }
  if (fouls !== null)
    stats.fouls = { home: fouls.home, away: fouls.away, total: fouls.home + fouls.away };

  json(res, 200, { stats });
}

// ---- Stats vía API-Football (fallback con guardián de cuota) ---------------

interface AfStatsResponse {
  response?: Array<{
    team?: { id?: number; name?: string };
    statistics?: Array<{ type?: string; value?: string | number | null }>;
  }>;
}

function afStatValue(
  rows: NonNullable<NonNullable<AfStatsResponse['response']>[number]['statistics']>,
  type: RegExp,
): number {
  for (const s of rows) {
    if (!type.test(s.type ?? '')) continue;
    const parsed = parseInt(String(s.value ?? '0'), 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

async function handleApiFootballStats(
  res: ApiRes,
  fixtureId: number,
): Promise<void> {
  const key = getApiKey();
  if (!key || !quotaAvailable()) {
    console.warn(
      '[api/results] stats API-Football omitida: sin key o cuota agotada',
    );
    json(res, 200, { stats: null });
    return;
  }

  consumeQuota('[api/results]');
  const payload = (await fetchJson(
    `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`,
    8000,
    { 'x-apisports-key': key },
  )) as AfStatsResponse;

  // La respuesta trae un bloque por equipo; el primero es local
  const blocks = payload.response ?? [];
  if (blocks.length < 2) {
    json(res, 200, { stats: null });
    return;
  }

  const home = blocks[0].statistics ?? [];
  const away = blocks[1].statistics ?? [];
  const cornersHome = afStatValue(home, /corner/i);
  const cornersAway = afStatValue(away, /corner/i);
  const sotHome = afStatValue(home, /shots?\s*on\s*goal|on\s*target/i);
  const sotAway = afStatValue(away, /shots?\s*on\s*goal|on\s*target/i);
  // Tiros TOTALES: "Shots Total"/"Total Shots" (excluye los de arco)
  const shotsHome = afStatValue(home, /shots?\s*total|total\s*shots/i);
  const shotsAway = afStatValue(away, /shots?\s*total|total\s*shots/i);
  const shotsTotal = shotsHome + shotsAway;
  const yellowHome = afStatValue(home, /yellow/i);
  const yellowAway = afStatValue(away, /yellow/i);
  const redHome = afStatValue(home, /red/i);
  const redAway = afStatValue(away, /red/i);
  const foulsHome = afStatValue(home, /foul/i);
  const foulsAway = afStatValue(away, /foul/i);

  json(res, 200, {
    stats: {
      fixtureId,
      homeTeam: blocks[0].team?.name ?? '',
      awayTeam: blocks[1].team?.name ?? '',
      corners: {
        home: cornersHome,
        away: cornersAway,
        total: cornersHome + cornersAway,
      },
      ...(shotsTotal > 0
        ? { shots: { home: shotsHome, away: shotsAway, total: shotsTotal } }
        : {}),
      shotsOnTarget: {
        home: sotHome,
        away: sotAway,
        total: sotHome + sotAway,
      },
      cards: {
        home: yellowHome + redHome,
        away: yellowAway + redAway,
        yellow: yellowHome + yellowAway,
        red: redHome + redAway,
        total: yellowHome + yellowAway + redHome + redAway,
      },
      fouls: {
        home: foulsHome,
        away: foulsAway,
        total: foulsHome + foulsAway,
      },
    },
  });
}

/** Ejecuta un handler de stats garantizando siempre forma {stats:...}. */
async function runStats(
  res: ApiRes,
  run: () => Promise<void>,
): Promise<void> {
  try {
    await run();
  } catch (err) {
    console.warn('[api/results] stats fallo:', err);
    json(res, 200, { stats: null });
  }
}

export default async function handler(
  req: ApiReq,
  res: ApiRes,
): Promise<void> {
  // Solo GET/HEAD: cualquier otro metodo bypasses el edge cache y quemaria
  // cuota al invocar la cascada. Sin body que procesar, no hay excusa.
  if (!isReadMethodOr405(req, res)) return;

  try {
    const query = req.query ?? {};

    // ?stats=<id-con-prefijo> -> estadisticas granulares.
    // El prefijo del id selecciona la fuente:
    //   af-<fixtureId> -> API-Football (consume cuota vigilada)
    //   ss-<slug>      -> SportScore match detail (gratis)
    //   espn-          -> sin stats granulares en la API de ESPN: null
    const statsParam = query.stats;
    if (statsParam !== undefined) {
      const raw = Array.isArray(statsParam) ? statsParam[0] : statsParam;
      const rawId = (raw ?? '').trim();

      if (rawId.startsWith('af-')) {
        const fixtureId = parseInt(rawId.slice(3), 10);
        if (!fixtureId) {
          json(res, 400, { error: 'Query param "stats" invalido' });
          return;
        }
        await runStats(res, () => handleApiFootballStats(res, fixtureId));
      } else if (rawId.startsWith('ss-')) {
        await runStats(res, () => handleSportScoreStats(res, rawId.slice(3)));
      } else {
        // ESPN u otra fuente sin endpoint de stats
        json(res, 200, { stats: null });
      }
      return;
    }

    // ?all=1 -> listado completo sin filtrar (para matching del sync)
    const allParam = query.all;
    if (allParam !== undefined) {
      const { source, results } = await getAllResults();
      json(res, 200, { source, results });
      return;
    }

    const raw = query.teams;
    const teamsParam = Array.isArray(raw) ? raw[0] : raw;
    const fragments = (teamsParam ?? '')
      .split('|')
      .map((t) => t.trim())
      .filter((t) => t !== '')
      .slice(0, 12);

    if (fragments.length === 0) {
      json(res, 200, { source: 'none', results: [] });
      return;
    }

    const { source, results } = await getAllResults();
    const filtered = results.filter(
      (r) => teamMatches(r.homeTeam, fragments) || teamMatches(r.awayTeam, fragments),
    );

    json(res, 200, { source, results: filtered });
  } catch (err) {
    console.error('[api/results]', err);
    json(res, 200, { source: 'none', results: [] });
  }
}
