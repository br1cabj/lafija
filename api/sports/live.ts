/**
 * GET /api/sports/live
 * Devuelve todos los partidos en vivo ahora mismo, normalizados.
 * Cachea 45s: N usuarios comparten la misma respuesta upstream.
 */

import { cachedUpstreamFetch, getApiKey, sendJsonError } from './_upstream.js';

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

interface UpstreamJson {
  response?: ApiFixture[];
}

export default async function handler(
  _req: unknown,
  res: { statusCode: number; setHeader(name: string, value: string): void; end(body: string): void },
): Promise<void> {
  if (!getApiKey()) {
    sendJsonError(res, 503, 'SPORTS_API_KEY no configurada en el servidor');
    return;
  }

  try {
    const json = (await cachedUpstreamFetch('/fixtures?live=all', 45_000)) as UpstreamJson;
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

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ fixtures }));
  } catch (err) {
    console.error('[api/sports/live]', err);
    sendJsonError(res, 502, 'Error consultando API-Sports');
  }
}
