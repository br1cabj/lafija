// Service for Live Sports Data (API-Football / RapidAPI & The Odds API)

const API_KEY = import.meta.env.VITE_SPORTS_API_KEY || ''
const API_BASE_URL = 'https://v3.football.api-sports.io'

export interface LiveFixtureStats {
  fixtureId: number
  minute: string
  status: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  corners: { home: number; away: number; total: number }
  shotsOnTarget: { home: number; away: number; total: number }
  cards: { yellow: number; red: number; total: number }
  fouls: { total: number }
}

export const isSportsApiConfigured = Boolean(API_KEY)

/**
 * Fetch live football fixtures of the day
 */
export async function fetchLiveFixtures(): Promise<any[]> {
  if (!isSportsApiConfigured) {
    console.warn('API-Football no está configurada en .env (VITE_SPORTS_API_KEY). Usando simulador local.')
    return []
  }

  try {
    const res = await fetch(`${API_BASE_URL}/fixtures?live=all`, {
      headers: {
        'x-apisports-key': API_KEY
      }
    })
    const data = await res.json()
    return data.response || []
  } catch (error) {
    console.error('Error al obtener partidos en vivo:', error)
    return []
  }
}

/**
 * Fetch granular live match stats (Corners, Shots on goal, Cards) for a specific fixture
 */
export async function fetchFixtureStatistics(fixtureId: number): Promise<LiveFixtureStats | null> {
  if (!isSportsApiConfigured) return null

  try {
    const res = await fetch(`${API_BASE_URL}/fixtures/statistics?fixture=${fixtureId}`, {
      headers: {
        'x-apisports-key': API_KEY
      }
    })
    const data = await res.json()
    const teamsStats = data.response || []

    if (teamsStats.length < 2) return null

    const getStat = (teamIndex: number, type: string): number => {
      const stat = teamsStats[teamIndex]?.statistics?.find((s: any) => s.type === type)
      return parseInt(stat?.value || '0', 10) || 0
    }

    const homeCorners = getStat(0, 'Corner Kicks')
    const awayCorners = getStat(1, 'Corner Kicks')
    const homeShots = getStat(0, 'Shots on Goal')
    const awayShots = getStat(1, 'Shots on Goal')
    const homeYellows = getStat(0, 'Yellow Cards')
    const awayYellows = getStat(1, 'Yellow Cards')

    return {
      fixtureId,
      minute: 'LIVE',
      status: '2H',
      homeTeam: teamsStats[0]?.team?.name || '',
      awayTeam: teamsStats[1]?.team?.name || '',
      homeScore: 0,
      awayScore: 0,
      corners: { home: homeCorners, away: awayCorners, total: homeCorners + awayCorners },
      shotsOnTarget: { home: homeShots, away: awayShots, total: homeShots + awayShots },
      cards: { yellow: homeYellows + awayYellows, red: 0, total: homeYellows + awayYellows },
      fouls: { total: getStat(0, 'Fouls') + getStat(1, 'Fouls') }
    }
  } catch (error) {
    console.error(`Error al obtener estadísticas del partido ${fixtureId}:`, error)
    return null
  }
}
