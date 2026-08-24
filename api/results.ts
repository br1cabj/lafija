/**
 * GET /api/results?teams=Real Madrid|Inter Miami
 *   -> Partidos en vivo/programados que coincidan con los equipos recibidos
 *      (fragmentos separados por "|"). Cache 45s.
 * GET /api/results?all=1
 *   -> Todos los eventos en vivo sin filtrar (para matching del sync).
 * GET /api/results?stats=12345
 *   -> Estadisticas granulares de SofaScore (córners/tarjetas/remates/faltas).
 *
 * Fuente de datos SIN consumir la cuota de API-Football: adaptador con dos
 * proveedores gratuitos (ESPN scoreboard / SofaScore). El proveedor primario
 * se elige con la env var RESULTS_PROVIDER (espn|sofascore, default espn).
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

// ---- Guardian de cuota diaria para API-Football ----------------------------
const DAILY_QUOTA_LIMIT = 80;
let quotaDate = '';
let quotaCount = 0;

function quotaAvailable(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (quotaDate !== today) {
    quotaDate = today;
    quotaCount = 0;
  }
  return quotaCount < DAILY_QUOTA_LIMIT;
}

function consumeQuota(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (quotaDate !== today) {
    quotaDate = today;
    quotaCount = 0;
  }
  quotaCount += 1;
  console.warn(
    `[api/results] cuota API-Football: ${quotaCount}/${DAILY_QUOTA_LIMIT} hoy`,
  );
}

export interface LiveResult {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: string;
  status: string; // LIVE | HT | FT | SCHEDULED | POSTPONED
  homeTeamId?: number;
  awayTeamId?: number;
}

type ProviderName = 'espn' | 'sofascore' | 'apifootball';

function getPrimaryProvider(): 'espn' | 'sofascore' {
  const raw = (process.env.RESULTS_PROVIDER ?? '').trim().toLowerCase();
  return raw === 'sofascore' ? 'sofascore' : 'espn';
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

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'lafija-results/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
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

// ---- Proveedor: SofaScore (gratuito, sin key, a veces con Cloudflare) ------

interface SofaEvent {
  id?: number;
  homeTeam?: { name?: string; id?: number };
  awayTeam?: { name?: string; id?: number };
  homeScore?: { current?: number };
  awayScore?: { current?: number };
  status?: { description?: string; type?: string };
  tournament?: { name?: string };
}

function mapSofaStatus(type: string | undefined): string {
  switch (type) {
    case 'inprogress':
      return 'LIVE';
    case 'finished':
      return 'FT';
    case 'postponed':
    case 'canceled':
      return 'POSTPONED';
    default:
      return 'SCHEDULED';
  }
}

async function fetchSofascore(): Promise<LiveResult[]> {
  const json = (await fetchJson(
    'https://api.sofascore.com/api/v1/sport/football/events/live',
  )) as { events?: SofaEvent[] };

  return (json.events ?? [])
    .filter((e) => e.homeTeam?.name && e.awayTeam?.name)
    .map((e) => ({
      id: `sofa-${e.id ?? 'x'}`,
      league: e.tournament?.name ?? '',
      homeTeam: e.homeTeam?.name ?? '',
      awayTeam: e.awayTeam?.name ?? '',
      homeScore: e.homeScore?.current ?? 0,
      awayScore: e.awayScore?.current ?? 0,
      minute: e.status?.description ?? '',
      status: mapSofaStatus(e.status?.type),
      homeTeamId: e.homeTeam?.id,
      awayTeamId: e.awayTeam?.id,
    }));
}

// ---- Fallback: API-Football (consume cuota; solo si los otros fallan) ------

async function fetchApiFootball(): Promise<LiveResult[]> {
  const key = process.env.SPORTS_API_KEY;
  if (!key || key.trim() === '') return [];
  // Guardián: sin cuota diaria disponible, esta ruta de la cascada se saltea
  if (!quotaAvailable()) {
    console.warn('[api/results] API-Football omitida: cuota diaria agotada');
    return [];
  }

  consumeQuota();
  const res = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
    headers: { 'x-apisports-key': key.trim() },
  });
  if (!res.ok) throw new Error(`API-Sports HTTP ${res.status}`);
  const json = (await res.json()) as {
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

  return (json.response ?? [])
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
  const secondary = primary === 'espn' ? 'sofascore' : 'espn';

  const loaders: Record<ProviderName, () => Promise<LiveResult[]>> = {
    espn: () => cachedProvider('espn', CACHE_TTL_MS, fetchEspn),
    sofascore: () => cachedProvider('sofascore', CACHE_TTL_MS, fetchSofascore),
    apifootball: () => cachedProvider('apifootball', CACHE_TTL_MS, fetchApiFootball),
  };

  const order: ProviderName[] = [primary, secondary, 'apifootball'];
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

interface SofaStatsResponse {
  statistics?: Array<{
    period?: string;
    groups?: Array<{
      groupName?: string;
      statisticsItems?: Array<{
        name?: string;
        home?: string;
        away?: string;
      }>;
    }>;
  }>;
}

/** Busca un valor numérico en los items de un grupo de SofaScore. */
function sofaGroupValue(
  stats: SofaStatsResponse['statistics'],
  group: string,
  item: string,
  side: 'home' | 'away',
): number {
  for (const period of stats ?? []) {
    if (period.period !== 'ALL') continue;
    for (const g of period.groups ?? []) {
      if (!new RegExp(group, 'i').test(g.groupName ?? '')) continue;
      for (const s of g.statisticsItems ?? []) {
        if (!new RegExp(item, 'i').test(s.name ?? '')) continue;
        const raw = side === 'home' ? s.home : s.away;
        const parsed = parseInt(String(raw ?? '0'), 10);
        return isNaN(parsed) ? 0 : parsed;
      }
    }
  }
  return 0;
}

async function handleStats(
  res: { statusCode: number; setHeader(name: string, value: string): void; end(body: string): void },
  eventId: number,
): Promise<void> {
  const json = (await fetchJson(
    `https://api.sofascore.com/api/v1/event/${eventId}/statistics`,
  )) as SofaStatsResponse;

  const all = json.statistics ?? [];
  if (all.length === 0) {
    sendJson(res, 200, { stats: null });
    return;
  }

  const cornersHome = sofaGroupValue(all, 'corner', 'corner', 'home');
  const cornersAway = sofaGroupValue(all, 'corner', 'corner', 'away');
  const sotHome = sofaGroupValue(all, 'shot', 'on target', 'home');
  const sotAway = sofaGroupValue(all, 'shot', 'on target', 'away');
  const yellowHome = sofaGroupValue(all, 'card', 'yellow', 'home');
  const yellowAway = sofaGroupValue(all, 'card', 'yellow', 'away');
  const redHome = sofaGroupValue(all, 'card', 'red', 'home');
  const redAway = sofaGroupValue(all, 'card', 'red', 'away');
  const foulsHome = sofaGroupValue(all, 'foul', 'foul', 'home');
  const foulsAway = sofaGroupValue(all, 'foul', 'foul', 'away');

  sendJson(res, 200, {
    stats: {
      fixtureId: eventId,
      homeTeam: '',
      awayTeam: '',
      corners: {
        home: cornersHome,
        away: cornersAway,
        total: cornersHome + cornersAway,
      },
      shotsOnTarget: {
        home: sotHome,
        away: sotAway,
        total: sotHome + sotAway,
      },
      cards: {
        yellow: yellowHome + yellowAway,
        red: redHome + redAway,
        total: yellowHome + yellowAway,
      },
      fouls: { total: foulsHome + foulsAway },
    },
  });
}

function sendJson(
  res: { statusCode: number; setHeader(name: string, value: string): void; end(body: string): void },
  status: number,
  body: unknown,
): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=30');
  res.end(JSON.stringify(body));
}

export default async function handler(
  req: { query?: Record<string, string | string[] | undefined> },
  res: { statusCode: number; setHeader(name: string, value: string): void; end(body: string): void },
): Promise<void> {
  try {
    const query = req.query ?? {};

    // ?stats=123 -> estadisticas granulares de SofaScore
    const statsParam = query.stats;
    if (statsParam !== undefined) {
      const raw = Array.isArray(statsParam) ? statsParam[0] : statsParam;
      const eventId = parseInt(raw ?? '', 10);
      if (!eventId) {
        sendJson(res, 400, { error: 'Query param "stats" invalido' });
        return;
      }
      await handleStats(res, eventId);
      return;
    }

    // ?all=1 -> listado completo sin filtrar (para matching del sync)
    const allParam = query.all;
    if (allParam !== undefined) {
      const { source, results } = await getAllResults();
      sendJson(res, 200, { source, results });
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
      sendJson(res, 200, { source: 'none', results: [] });
      return;
    }

    const { source, results } = await getAllResults();
    const filtered = results.filter(
      (r) => teamMatches(r.homeTeam, fragments) || teamMatches(r.awayTeam, fragments),
    );

    sendJson(res, 200, { source, results: filtered });
  } catch (err) {
    console.error('[api/results]', err);
    sendJson(res, 200, { source: 'none', results: [] });
  }
}
