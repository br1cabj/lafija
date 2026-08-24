/**
 * Cliente del proxy serverless /api/results (resultados en vivo SIN
 * consumir la cuota de API-Football: ESPN/SofaScore con adaptador).
 */

export interface LiveResult {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: string;
  status: string; // LIVE | HT | FT | SCHEDULED | POSTPONED
}

export async function fetchLiveResults(
  teamNames: string[],
): Promise<LiveResult[]> {
  if (teamNames.length === 0) return [];
  try {
    const res = await fetch(`/api/results?teams=${encodeURIComponent(teamNames.join('|'))}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: LiveResult[] };
    return json.results ?? [];
  } catch {
    return [];
  }
}
