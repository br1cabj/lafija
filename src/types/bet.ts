export type SportType =
  | 'football'
  | 'basketball'
  | 'tennis'
  | 'baseball'
  | 'esports'
  | 'mma';

export type BetStatus =
  | 'PENDING'
  | 'LIVE'
  | 'WON'
  | 'LOST'
  | 'CASHOUT'
  | 'VOID';

export type ConditionStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'MET'
  | 'BUSTED'
  | 'CLUTCH_DANGER';

export interface BetCondition {
  id: string;
  market: string; // ej. "Goles Totales", "Córners", "Tiros al arco"
  selection: string; // ej. "Más de 8.5 Córners", "Vinicius 1+ tiro a puerta"
  targetValue: number | string; // ej. 8.5, 1, "Real Madrid"
  currentValue: number | string; // ej. 7, 2, "Real Madrid"
  progress: number; // 0 a 100%
  unit?: string; // ej. "córners", "remates", "goles", "pts"
  status: ConditionStatus;
  isLock: boolean; // Ya cumplido irreversiblemente
  dangerNote?: string; // Alerta clutch cuando está en riesgo al final
}

export interface MatchInfo {
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  minute?: string;
  period?: 'PRE' | '1H' | 'HT' | '2H' | 'FT' | 'OT';
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED';
  startTime: string;
  league: string;
}

export interface Bet {
  id: string;
  title: string;
  sport: SportType;
  league: string;
  type: 'single' | 'parlay' | 'bet_builder';
  match: MatchInfo;
  stake: number;
  odds: number;
  potentialPayout: number;
  bookmaker: string;
  status: BetStatus;
  cashoutValue?: number | null;
  conditions: BetCondition[];
  createdAt: string;
  notes?: string;
  tags: string[];
}

export interface UserStats {
  bankroll: number;
  initialBankroll: number;
  totalStaked: number;
  totalWon: number;
  netProfit: number;
  roi: number;
  yield: number;
  winRate: number;
  activeBets: number;
  liveBets: number;
  clutchBets: number;
  winStreak: number;
  faceitLevel: number; // 1 to 10
  eloRating: number;
}
