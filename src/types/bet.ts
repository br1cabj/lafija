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
  | 'CLUTCH_DANGER'
  | 'VOID';

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
  /** Cuota individual de la selección (opcional, para recálculo si se anula). */
  odds?: number;
  /** Super Sub: si el jugador es sustituido, la línea hereda al suplente. */
  superSub?: boolean;
  /** Jugador original del que heredó la línea (tras un cambio Super Sub). */
  supersubFrom?: string;
  /**
   * Partido de esta pata en builders multi-partido. Opcional: si falta,
   * la pata pertenece al partido principal de la apuesta.
   */
  match?: ConditionMatch;
}

/** Referencia mínima al partido de una pata (builders multi-partido). */
export interface ConditionMatch {
  homeTeam: string;
  awayTeam: string;
  homeTeamId?: number;
  awayTeamId?: number;
}

export interface MatchInfo {
  homeTeam: string;
  awayTeam: string;
  /** ID canónico del equipo en API-Football (del autocomplete al crear). */
  homeTeamId?: number;
  awayTeamId?: number;
  homeScore?: number;
  awayScore?: number;
  minute?: string;
  period?: 'PRE' | '1H' | 'HT' | '2H' | 'FT' | 'OT';
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED';
  startTime: string;
  league: string;
  /** true si el live sync encontró el partido en la API. */
  linked?: boolean;
}

export type BetType = 'single' | 'parlay' | 'bet_builder';

export interface Bet {
  id: string;
  title: string;
  sport: SportType;
  league: string;
  type: BetType;
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
  rankLevel: number; // 1 to 10
  eloRating: number;
}

export interface LiveEventLog {
  id: string;
  time: string;
  betId: string;
  matchTitle: string;
  text: string;
  type: 'GOAL' | 'CORNER' | 'CARD' | 'SHOT' | 'CUMPLIDO' | 'CLUTCH' | 'INFO';
}

/** Type guard: condición con progreso numérico (vs. resultado textual tipo "1X"). */
export function isNumericCondition(
  cond: BetCondition,
): cond is BetCondition & { targetValue: number; currentValue: number } {
  return (
    typeof cond.targetValue === 'number' && typeof cond.currentValue === 'number'
  );
}

export function formatConditionValue(cond: BetCondition): string {
  if (isNumericCondition(cond)) return `${cond.currentValue}/${cond.targetValue}`;
  return String(cond.currentValue ?? '');
}

/**
 * Cuota individual estimada de cada pata: reparto geométrico de la cuota
 * total. Es la misma aproximación que usan las casas al recalcular un
 * boleto con anuladas cuando no conocés las cuotas por selección.
 */
export function estimateLegOdds(bet: Bet): number {
  const n = bet.conditions.length;
  if (n === 0) return Math.max(1, bet.odds);
  return Math.pow(Math.max(1, bet.odds), 1 / n);
}

/** Cuota real cargada de una condición; undefined si no hay válida. */
function legOdds(c: BetCondition): number | undefined {
  return typeof c.odds === 'number' && c.odds > 0 ? c.odds : undefined;
}

/** true si alguna pata activa usa cuota estimada en lugar de real. */
export function hasEstimatedLegs(bet: Bet): boolean {
  return bet.conditions.some((c) => c.status !== 'VOID' && !legOdds(c));
}

/**
 * Cuota efectiva de la apuesta tras anulaciones por condición.
 * - Sin anuladas y sin cuotas individuales: la cuota total original.
 * - Con anuladas: producto de las activas usando su cuota real si fue
 *   cargada; si no, la estimación geométrica (como recalculan las casas).
 * - Si todas se anulan: 1.0 (reembolso del stake).
 */
export function effectiveOdds(bet: Bet): number {
  const total = bet.conditions.length;
  if (total === 0) return bet.odds;

  const active = bet.conditions.filter((c) => c.status !== 'VOID');
  if (active.length === 0) return 1;

  // Sin anuladas y sin cuotas individuales: la original es exacta
  const anyReal = bet.conditions.some((c) => legOdds(c) !== undefined);
  if (active.length === total && !anyReal) return bet.odds;

  const fallback = estimateLegOdds(bet);
  const product = active.reduce(
    (acc, c) => acc * (legOdds(c) ?? fallback),
    1,
  );
  return Number(product.toFixed(3));
}
