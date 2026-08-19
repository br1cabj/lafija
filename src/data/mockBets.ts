import type { Bet, UserStats } from '../types/bet'

export const initialStats: UserStats = {
  bankroll: 1845.50,
  initialBankroll: 1200.00,
  totalStaked: 3420.00,
  totalWon: 4065.50,
  netProfit: 645.50,
  roi: 18.87,
  yield: 18.87,
  winRate: 68.4,
  activeBets: 4,
  liveBets: 2,
  clutchBets: 1,
  winStreak: 4,
  faceitLevel: 8,
  eloRating: 1840,
}

export const initialBets: Bet[] = [
  {
    id: 'bet-001',
    title: 'Real Madrid vs Man City // Master Parlay',
    sport: 'football',
    type: 'bet_builder',
    league: 'UEFA Champions League',
    match: {
      homeTeam: 'Real Madrid',
      awayTeam: 'Manchester City',
      homeScore: 2,
      awayScore: 1,
      minute: "79'",
      period: '2H',
      status: 'LIVE',
      startTime: '2026-08-18T21:00:00Z',
      league: 'UEFA Champions League'
    },
    stake: 50.00,
    odds: 4.85,
    potentialPayout: 242.50,
    bookmaker: 'Bet365',
    status: 'LIVE',
    cashoutValue: 168.00,
    createdAt: '2026-08-18T19:30:00Z',
    tags: ['Champions League', 'BetBuilder', 'HighConfidence'],
    notes: 'Partido de vuelta semifinales. Madrid atacando por banda izquierda con Vinicius.',
    conditions: [
      {
        id: 'cond-1-1',
        market: 'Resultado Partido',
        selection: 'Real Madrid o Empate (1X)',
        targetValue: '1X',
        currentValue: '2-1 (Gana Real Madrid)',
        progress: 100,
        status: 'MET',
        isLock: false,
        dangerNote: 'Minuto 79: City presionando'
      },
      {
        id: 'cond-1-2',
        market: 'Goles Totales',
        selection: 'Más de 2.5 Goles',
        targetValue: 2.5,
        currentValue: 3,
        progress: 100,
        unit: 'goles',
        status: 'MET',
        isLock: true // Ya van 3 goles, matemáticamente asegurado
      },
      {
        id: 'cond-1-3',
        market: 'Tiros a Puerta Jugador',
        selection: 'Vinicius Jr +0.5 Tiros a puerta',
        targetValue: 1,
        currentValue: 2,
        progress: 100,
        unit: 'tiros',
        status: 'MET',
        isLock: true
      },
      {
        id: 'cond-1-4',
        market: 'Córners Totales',
        selection: 'Más de 8.5 Córners en el partido',
        targetValue: 8.5,
        currentValue: 7,
        progress: 78,
        unit: 'córners',
        status: 'CLUTCH_DANGER',
        isLock: false,
        dangerNote: '⚡ CLUTCH: Faltan 2 córners en los últimos 11 min'
      }
    ]
  },
  {
    id: 'bet-002',
    title: 'Arsenal vs Chelsea // London Derby',
    sport: 'football',
    type: 'parlay',
    league: 'Premier League',
    match: {
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      homeScore: 1,
      awayScore: 0,
      minute: "54'",
      period: '2H',
      status: 'LIVE',
      startTime: '2026-08-18T20:30:00Z',
      league: 'Premier League'
    },
    stake: 35.00,
    odds: 3.10,
    potentialPayout: 108.50,
    bookmaker: '1xBet',
    status: 'LIVE',
    cashoutValue: 48.20,
    createdAt: '2026-08-18T19:00:00Z',
    tags: ['PremierLeague', 'Derby'],
    conditions: [
      {
        id: 'cond-2-1',
        market: 'Tarjetas Totales',
        selection: 'Más de 3.5 Tarjetas',
        targetValue: 3.5,
        currentValue: 3,
        progress: 75,
        unit: 'tarjetas',
        status: 'IN_PROGRESS',
        isLock: false,
        dangerNote: 'Falta 1 tarjeta (partido con mucho roce)'
      },
      {
        id: 'cond-2-2',
        market: 'Ambos Equipos Anotan',
        selection: 'Ambos Equipos Marcan (Sí)',
        targetValue: 'Sí',
        currentValue: '1-0 (Falta gol de Chelsea)',
        progress: 50,
        status: 'IN_PROGRESS',
        isLock: false
      }
    ]
  },
  {
    id: 'bet-003',
    title: 'Boston Celtics vs Dallas Mavericks // NBA Finals Game',
    sport: 'basketball',
    type: 'parlay',
    league: 'NBA',
    match: {
      homeTeam: 'Boston Celtics',
      awayTeam: 'Dallas Mavericks',
      status: 'SCHEDULED',
      startTime: '2026-08-19T01:30:00Z',
      league: 'NBA'
    },
    stake: 40.00,
    odds: 3.60,
    potentialPayout: 144.00,
    bookmaker: 'Codere',
    status: 'PENDING',
    createdAt: '2026-08-18T22:00:00Z',
    tags: ['NBA', 'PlayerProps'],
    conditions: [
      {
        id: 'cond-3-1',
        market: 'Puntos Jugador',
        selection: 'Jayson Tatum +24.5 Puntos',
        targetValue: 24.5,
        currentValue: 0,
        progress: 0,
        unit: 'pts',
        status: 'PENDING',
        isLock: false
      },
      {
        id: 'cond-3-2',
        market: 'Asistencias Jugador',
        selection: 'Luka Doncic +7.5 Asistencias',
        targetValue: 7.5,
        currentValue: 0,
        progress: 0,
        unit: 'ast',
        status: 'PENDING',
        isLock: false
      },
      {
        id: 'cond-3-3',
        market: 'Línea de Dinero',
        selection: 'Boston Celtics Gana',
        targetValue: 'Celtics ML',
        currentValue: 'Pre-Match',
        progress: 0,
        status: 'PENDING',
        isLock: false
      }
    ]
  },
  {
    id: 'bet-004',
    title: 'Inter Milan vs Atletico Madrid // Knockout Clash',
    sport: 'football',
    type: 'single',
    league: 'UEFA Champions League',
    match: {
      homeTeam: 'Inter Milan',
      awayTeam: 'Atletico Madrid',
      homeScore: 1,
      awayScore: 0,
      status: 'FINISHED',
      startTime: '2026-08-17T20:00:00Z',
      league: 'UEFA Champions League'
    },
    stake: 60.00,
    odds: 2.20,
    potentialPayout: 132.00,
    bookmaker: 'Bet365',
    status: 'WON',
    createdAt: '2026-08-17T18:00:00Z',
    tags: ['ChampionsLeague', 'Inter'],
    conditions: [
      {
        id: 'cond-4-1',
        market: 'Ganador Partido',
        selection: 'Inter Milan Gana',
        targetValue: 'Inter',
        currentValue: '1-0 (Finalizado)',
        progress: 100,
        status: 'MET',
        isLock: true
      }
    ]
  },
  {
    id: 'bet-005',
    title: 'Bayern Munich vs Borussia Dortmund // Der Klassiker',
    sport: 'football',
    type: 'parlay',
    league: 'Bundesliga',
    match: {
      homeTeam: 'Bayern Munich',
      awayTeam: 'Borussia Dortmund',
      homeScore: 2,
      awayScore: 2,
      status: 'FINISHED',
      startTime: '2026-08-16T17:30:00Z',
      league: 'Bundesliga'
    },
    stake: 25.00,
    odds: 5.20,
    potentialPayout: 130.00,
    bookmaker: 'Stake',
    status: 'LOST',
    createdAt: '2026-08-16T15:00:00Z',
    tags: ['Bundesliga'],
    conditions: [
      {
        id: 'cond-5-1',
        market: 'Goles Totales',
        selection: 'Más de 3.5 Goles',
        targetValue: 3.5,
        currentValue: 4,
        progress: 100,
        unit: 'goles',
        status: 'MET',
        isLock: true
      },
      {
        id: 'cond-5-2',
        market: 'Ganador Partido',
        selection: 'Bayern Munich Gana',
        targetValue: 'Bayern',
        currentValue: 'Empate 2-2',
        progress: 0,
        status: 'BUSTED',
        isLock: false
      }
    ]
  }
]
