/**
 * GET /api/sports?type=live
 *   -> Todos los partidos en vivo ahora mismo (cache 45s).
 * GET /api/sports?fixture=123456
 *   -> Estadisticas granulares del partido (cache 30s).
 *
 * Funcion unica y autocontenida: sin imports relativos para evitar
 * problemas de resolucion ESM en el build de Vercel.
 * La API key vive SOLO server-side (env var SPORTS_API_KEY en Vercel).
 */

const API_BASE_URL = 'https://v3.football.api-sports.io';
const LIVE_TTL_MS = 45_000;
const STATS_TTL_MS = 30_000;

interface CacheEntry {
  ts: number;
  data: unknown;
}

// Cache en memoria por instancia: N usuarios mirando el mismo partido
// cuentan como 1 request upstream por ventana de TTL.
const cache = new Map<string, CacheEntry>();

function getApiKey(): string | null {
  const key = process.env.SPORTS_API_KEY;
  return key && key.trim() !== '' ? key.trim() : null;
}

async function cachedUpstreamFetch(
  path: string,
  ttlMs: number,
): Promise<unknown> {
  const hit = cache.get(path);
  const now = Date.now();
  if (hit && now - hit.ts < ttlMs) {
    return hit.data;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'x-apisports-key': getApiKey() ?? '' },
  });
  if (!res.ok) {
    throw new Error(`API-Sports HTTP ${res.status}`);
  }
  const json = (await res.json()) as unknown;
  cache.set(path, { ts: now, data: json });
  if (cache.size > 100) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return json;
}

function sendJson(
  res: { statusCode: number; setHeader(name: string, value: string): void; end(body: string): void },
  status: number,
  body: unknown,
): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

// ---- Handlers ----

interface ApiFixture {
  fixture?: {
    id?: number;
    date?: string;
    status?: { short?: string; elapsed?: number | null };
  };
  league?: { name?: string; country?: string };
  teams?: {
    home?: { name?: string };
    away?: { name?: string };
  };
  goals?: { home?: number | null; away?: number | null };
}

async function handleLive(
  res: { statusCode: number; setHeader(name: string, value: string): void; end(body: string): void },
): Promise<void> {
  const json = (await cachedUpstreamFetch('/fixtures?live=all', LIVE_TTL_MS)) as {
    response?: ApiFixture[];
  };

  const fixtures = (json.response ?? []).map((f) => ({
    fixtureId: f.fixture?.id ?? 0,
    league: f.league?.name ?? '',
    country: f.league?.country ?? '',
    minute:
      f.fixture?.status?.elapsed != null ? `${f.fixture.status.elapsed}'` : '',
    statusShort: f.fixture?.status?.short ?? 'NS',
    homeTeam: f.teams?.home?.name ?? '',
    awayTeam: f.teams?.away?.name ?? '',
    homeScore: f.goals?.home ?? 0,
    awayScore: f.goals?.away ?? 0,
    startTime: f.fixture?.date ?? '',
  }));

  sendJson(res, 200, { fixtures });
}

interface ApiStatItem {
  type?: string;
  value?: number | string | null;
}

async function handleStats(
  res: { statusCode: number; setHeader(name: string, value: string): void; end(body: string): void },
  fixtureId: number,
): Promise<void> {
  const json = (await cachedUpstreamFetch(
    `/fixtures/statistics?fixture=${fixtureId}`,
    STATS_TTL_MS,
  )) as { response?: Array<{ team?: { name?: string }; statistics?: ApiStatItem[] }> };

  const teamsStats = json.response ?? [];
  if (teamsStats.length < 2) {
    sendJson(res, 200, { stats: null });
    return;
  }

  const getStat = (teamIndex: number, type: string): number => {
    const raw = teamsStats[teamIndex]?.statistics?.find(
      (s) => s.type === type,
    )?.value;
    const parsed =
      typeof raw === 'number' ? raw : parseInt(String(raw ?? '0'), 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const homeCorners = getStat(0, 'Corner Kicks');
  const awayCorners = getStat(1, 'Corner Kicks');
  const homeShots = getStat(0, 'Shots on Goal');
  const awayShots = getStat(1, 'Shots on Goal');
  const homeYellows = getStat(0, 'Yellow Cards');
  const awayYellows = getStat(1, 'Yellow Cards');

  sendJson(res, 200, {
    stats: {
      fixtureId,
      homeTeam: teamsStats[0]?.team?.name ?? '',
      awayTeam: teamsStats[1]?.team?.name ?? '',
      corners: {
        home: homeCorners,
        away: awayCorners,
        total: homeCorners + awayCorners,
      },
      shotsOnTarget: {
        home: homeShots,
        away: awayShots,
        total: homeShots + awayShots,
      },
      cards: {
        yellow: homeYellows + awayYellows,
        red: getStat(0, 'Red Cards') + getStat(1, 'Red Cards'),
        total: homeYellows + awayYellows,
      },
      fouls: { total: getStat(0, 'Fouls') + getStat(1, 'Fouls') },
    },
  });
}

export default async function handler(
  req: { query?: Record<string, string | string[] | undefined> },
  res: { statusCode: number; setHeader(name: string, value: string): void; end(body: string): void },
): Promise<void> {
  if (!getApiKey()) {
    sendJson(res, 503, { error: 'SPORTS_API_KEY no configurada en el servidor' });
    return;
  }

  try {
    const query = req.query ?? {};
    const fixtureParam = query.fixture;

    // ?fixture=123 -> estadisticas del partido
    if (fixtureParam !== undefined) {
      const raw = Array.isArray(fixtureParam) ? fixtureParam[0] : fixtureParam;
      const fixtureId = parseInt(raw ?? '', 10);
      if (!fixtureId) {
        sendJson(res, 400, { error: 'Query param "fixture" invalido' });
        return;
      }
      await handleStats(res, fixtureId);
      return;
    }

    // ?type=live (default) -> partidos en vivo
    await handleLive(res);
  } catch (err) {
    console.error('[api/sports]', err);
    sendJson(res, 502, { error: 'Error consultando API-Sports' });
  }
}
