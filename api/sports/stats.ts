/**
 * GET /api/sports/stats?fixture=123456
 * Estadisticas granulares en vivo (corners, tiros al arco, tarjetas, fouls).
 * Cachea 30s por fixture.
 */

import { cachedUpstreamFetch, getApiKey, sendJsonError } from './_upstream.js';

interface ApiStatItem {
  type?: string;
  value?: number | string | null;
}

interface ApiTeamStats {
  team?: { name?: string };
  statistics?: ApiStatItem[];
}

interface UpstreamJson {
  response?: ApiTeamStats[];
}

function getStat(team: ApiTeamStats | undefined, type: string): number {
  const raw = team?.statistics?.find((s) => s.type === type)?.value;
  const parsed = typeof raw === 'number' ? raw : parseInt(String(raw ?? '0'), 10);
  return isNaN(parsed) ? 0 : parsed;
}

export default async function handler(
  req: { query?: Record<string, string | string[] | undefined> },
  res: { statusCode: number; setHeader(name: string, value: string): void; end(body: string): void },
): Promise<void> {
  if (!getApiKey()) {
    sendJsonError(res, 503, 'SPORTS_API_KEY no configurada en el servidor');
    return;
  }

  const fixtureParam = req.query?.fixture;
  const fixtureId = parseInt(
    Array.isArray(fixtureParam) ? fixtureParam[0] : (fixtureParam ?? ''),
    10,
  );
  if (!fixtureId) {
    sendJsonError(res, 400, 'Query param "fixture" requerido');
    return;
  }

  try {
    const json = (await cachedUpstreamFetch(
      `/fixtures/statistics?fixture=${fixtureId}`,
      30_000,
    )) as UpstreamJson;

    const teamsStats = json.response ?? [];
    if (teamsStats.length < 2) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ stats: null }));
      return;
    }

    const homeCorners = getStat(teamsStats[0], 'Corner Kicks');
    const awayCorners = getStat(teamsStats[1], 'Corner Kicks');
    const homeShots = getStat(teamsStats[0], 'Shots on Goal');
    const awayShots = getStat(teamsStats[1], 'Shots on Goal');
    const homeYellows = getStat(teamsStats[0], 'Yellow Cards');
    const awayYellows = getStat(teamsStats[1], 'Yellow Cards');

    const stats = {
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
        red:
          getStat(teamsStats[0], 'Red Cards') +
          getStat(teamsStats[1], 'Red Cards'),
        total: homeYellows + awayYellows,
      },
      fouls: {
        total: getStat(teamsStats[0], 'Fouls') + getStat(teamsStats[1], 'Fouls'),
      },
    };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ stats }));
  } catch (err) {
    console.error('[api/sports/stats]', err);
    sendJsonError(res, 502, 'Error consultando API-Sports');
  }
}
