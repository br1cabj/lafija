import type { Bet, BetCondition, BetStatus, SportType } from '../types/bet';
import type { Note } from '../types/note';

/**
 * Sanitización defensiva de datos que vienen de localStorage o de la nube:
 * nunca se confía en el shape. Entradas inválidas se reparan o se descartan,
 * pero un registro podrido jamás tira la app entera.
 */

const SPORTS: readonly SportType[] = [
  'football',
  'basketball',
  'tennis',
  'baseball',
  'esports',
  'mma',
];
const BET_STATUSES: readonly BetStatus[] = [
  'PENDING',
  'LIVE',
  'WON',
  'LOST',
  'CASHOUT',
  'VOID',
];
const CONDITION_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'MET',
  'BUSTED',
  'CLUTCH_DANGER',
  'VOID',
] as const;

/** Número finito y no negativo; si no, fallback. */
function safeNumber(v: unknown, fallback: number, min = -Infinity): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return v < min ? fallback : v;
}

function safeString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function sanitizeCondition(raw: unknown): BetCondition | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const c = raw as Record<string, unknown>;
  const id = safeString(c.id);
  if (!id) return null;

  const targetValue =
    typeof c.targetValue === 'number'
      ? c.targetValue
      : typeof c.targetValue === 'string'
        ? c.targetValue
        : '';
  const currentValue =
    typeof c.currentValue === 'number'
      ? c.currentValue
      : typeof c.currentValue === 'string'
        ? c.currentValue
        : '';

  return {
    id,
    market: safeString(c.market),
    selection: safeString(c.selection),
    targetValue,
    currentValue,
    progress: Math.max(0, Math.min(100, safeNumber(c.progress, 0))),
    unit: typeof c.unit === 'string' ? c.unit : undefined,
    status: (CONDITION_STATUSES as readonly string[]).includes(
      String(c.status),
    )
      ? (c.status as BetCondition['status'])
      : 'PENDING',
    isLock: c.isLock === true,
    dangerNote: typeof c.dangerNote === 'string' ? c.dangerNote : undefined,
    odds: typeof c.odds === 'number' && Number.isFinite(c.odds) && c.odds > 0 ? c.odds : undefined,
    superSub: c.superSub === true,
    supersubFrom:
      typeof c.supersubFrom === 'string' ? c.supersubFrom : undefined,
  };
}

function sanitizeBet(raw: unknown): Bet | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const b = raw as Record<string, unknown>;
  const id = safeString(b.id);
  if (!id) return null;

  const m = (typeof b.match === 'object' && b.match !== null
    ? b.match
    : {}) as Record<string, unknown>;
  const matchStatus = ['SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED'].includes(
    String(m.status),
  )
    ? (m.status as Bet['match']['status'])
    : 'SCHEDULED';

  const conditions = Array.isArray(b.conditions)
    ? b.conditions
        .map(sanitizeCondition)
        .filter((c): c is BetCondition => c !== null)
    : [];

  const sport = SPORTS.includes(b.sport as SportType)
    ? (b.sport as SportType)
    : 'football';
  const type = ['single', 'parlay', 'bet_builder'].includes(String(b.type))
    ? (b.type as Bet['type'])
    : 'single';
  const status = BET_STATUSES.includes(b.status as BetStatus)
    ? (b.status as BetStatus)
    : 'PENDING';

  return {
    id,
    title: safeString(b.title, 'Apuesta'),
    sport,
    league: safeString(b.league),
    type,
    match: {
      homeTeam: safeString(m.homeTeam),
      awayTeam: safeString(m.awayTeam),
      homeTeamId:
        typeof m.homeTeamId === 'number' && Number.isFinite(m.homeTeamId)
          ? m.homeTeamId
          : undefined,
      awayTeamId:
        typeof m.awayTeamId === 'number' && Number.isFinite(m.awayTeamId)
          ? m.awayTeamId
          : undefined,
      homeScore: safeNumber(m.homeScore, 0, 0),
      awayScore: safeNumber(m.awayScore, 0, 0),
      minute: safeString(m.minute),
      period: ['PRE', '1H', 'HT', '2H', 'FT', 'OT'].includes(String(m.period))
        ? (m.period as Bet['match']['period'])
        : undefined,
      status: matchStatus,
      startTime: safeString(m.startTime),
      league: safeString(m.league),
      linked: m.linked === true,
    },
    stake: safeNumber(b.stake, 0, 0),
    odds: Math.max(1, safeNumber(b.odds, 1, 1)),
    potentialPayout: safeNumber(b.potentialPayout, 0, 0),
    bookmaker: safeString(b.bookmaker),
    status,
    cashoutValue:
      typeof b.cashoutValue === 'number' && Number.isFinite(b.cashoutValue)
        ? b.cashoutValue
        : null,
    conditions,
    createdAt: safeString(b.createdAt, new Date().toISOString()),
    notes: typeof b.notes === 'string' ? b.notes : undefined,
    tags: Array.isArray(b.tags)
      ? b.tags.filter((t): t is string => typeof t === 'string')
      : [],
  };
}

/** Filtra/repara una lista de apuestas de origen desconocido. */
export function sanitizeBets(raw: unknown): Bet[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(sanitizeBet)
    .filter((b): b is Bet => b !== null);
}

/** Filtra/repara una lista de notas de origen desconocido. */
export function sanitizeNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((n): Note | null => {
      if (typeof n !== 'object' || n === null) return null;
      const r = n as Record<string, unknown>;
      const id = safeString(r.id);
      if (!id) return null;
      return {
        id,
        title: safeString(r.title),
        content: safeString(r.content),
        pinned: r.pinned === true,
        createdAt: safeString(r.createdAt, new Date().toISOString()),
        updatedAt: safeString(r.updatedAt, new Date().toISOString()),
      };
    })
    .filter((n): n is Note => n !== null);
}
