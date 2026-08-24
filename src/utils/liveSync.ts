import type { Bet, BetCondition, MatchInfo } from '../types/bet';
import { isNumericCondition } from '../types/bet';
import { computeCashout } from './simulation';
import type { LiveFixture, LiveFixtureStats } from '../services/sportsApi';

/** Normaliza nombres de equipos para el matching (minúsculas, sin acentos). */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Encuentra el partido en vivo que corresponde a una apuesta
 * comparando equipos local/visitante en ambos sentidos.
 */
export function findFixtureForBet(
  bet: Bet,
  fixtures: LiveFixture[],
): LiveFixture | null {
  const home = normalizeName(bet.match.homeTeam);
  const away = normalizeName(bet.match.awayTeam);
  if (!home || !away) return null;

  return (
    fixtures.find((f) => {
      const fHome = normalizeName(f.homeTeam);
      const fAway = normalizeName(f.awayTeam);
      return (
        (fHome.includes(home) || home.includes(fHome)) &&
        (fAway.includes(away) || away.includes(fAway))
      );
    }) ?? null
  );
}

const totalGoals = (fixture: LiveFixture): number =>
  fixture.homeScore + fixture.awayScore;

/**
 * Mapea una condición numérica a la estadística TOTAL del partido que le
 * corresponde. Devuelve null para condiciones no mapeables automáticamente
 * (props de jugador, condiciones por equipo o de resultado).
 */
export function statForCondition(
  cond: BetCondition,
  fixture: LiveFixture,
  stats: LiveFixtureStats | null,
): number | null {
  if (!isNumericCondition(cond)) return null;

  const text = normalizeName(`${cond.market} ${cond.selection}`);

  // El orden importa: córners/tarjetas antes que goles.
  if (/corner/.test(text)) {
    return stats ? stats.corners.total : null;
  }
  if (/tarjeta|card/.test(text)) {
    return stats ? stats.cards.total : null;
  }
  if (/tiro|remate|shot/.test(text)) {
    return stats ? stats.shotsOnTarget.total : null;
  }
  if (/falta|foul/.test(text)) {
    return stats ? stats.fouls.total : null;
  }
  if (/gol|goal/.test(text)) {
    // "Más/Menos de X goles" sobre el total del partido
    return totalGoals(fixture);
  }

  return null;
}

/** Traduce el status corto de API-Sports al estado interno del match. */
function mapMatchInfo(
  fixture: LiveFixture,
  current: MatchInfo,
): MatchInfo {
  let status: MatchInfo['status'] = 'LIVE';
  let period: MatchInfo['period'] = current.period ?? '1H';

  switch (fixture.statusShort) {
    case '1H':
    case '2H':
    case 'ET':
    case 'BT':
    case 'P':
      status = 'LIVE';
      period =
        fixture.statusShort === '1H'
          ? '1H'
          : fixture.statusShort === '2H'
            ? '2H'
            : 'OT';
      break;
    case 'HT':
      status = 'LIVE';
      period = 'HT';
      break;
    case 'FT':
    case 'AET':
    case 'PEN':
      status = 'FINISHED';
      period = 'FT';
      break;
    case 'PST':
    case 'CANC':
    case 'ABD':
    case 'SUSP':
      status = 'POSTPONED';
      break;
    default:
      status = 'LIVE';
      break;
  }

  return {
    ...current,
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
    minute: fixture.minute || current.minute,
    period,
    status,
  };
}

export interface LiveSyncResult {
  bet: Bet;
  /** Selecciones que pasaron a MET con esta actualización (para logs). */
  newHits: string[];
}

/**
 * Aplica los datos reales del partido a una apuesta LIVE.
 * Función pura: no auto-asienta la apuesta (WON/LOST sigue siendo manual);
 * solo actualiza marcador, minuto y valores/estado de las condiciones.
 */
export function applyLiveUpdate(
  bet: Bet,
  fixture: LiveFixture,
  stats: LiveFixtureStats | null,
): LiveSyncResult {
  if (bet.status !== 'LIVE') return { bet, newHits: [] };

  const newHits: string[] = [];
  const minuteNum = parseInt(fixture.minute.replace(/[^0-9]/g, ''), 10) || 0;

  const newConditions = bet.conditions.map((cond): BetCondition => {
    const value = statForCondition(cond, fixture, stats);
    if (value === null || !isNumericCondition(cond)) return cond;
    if (value <= cond.currentValue) return cond;

    const isMet = value >= cond.targetValue;
    if (isMet && !cond.isLock) newHits.push(cond.selection);

    return {
      ...cond,
      currentValue: value,
      progress: Math.min(100, Math.round((value / cond.targetValue) * 100)),
      status: isMet
        ? ('MET' as const)
        : minuteNum >= 80
          ? ('CLUTCH_DANGER' as const)
          : ('IN_PROGRESS' as const),
      isLock: isMet ? true : cond.isLock,
    };
  });

  return {
    bet: {
      ...bet,
      match: mapMatchInfo(fixture, bet.match),
      cashoutValue: computeCashout(bet, newConditions),
      conditions: newConditions,
    },
    newHits,
  };
}
