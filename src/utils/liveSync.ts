import type { Bet, BetCondition, MatchInfo } from '../types/bet';
import { isNumericCondition } from '../types/bet';
import { computeCashout } from './simulation';
import { expandAlias } from '../data/teamAliases';
import type { LiveFixture, LiveFixtureStats } from '../services/sportsApi';

/** Normaliza nombres de equipos para el matching (minúsculas, sin acentos). */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Tokens significativos de un nombre (para matching difuso). */
function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

/**
 * Matching difuso entre dos nombres de equipo:
 * 1. Igualdad exacta normalizada o vía diccionario de alias.
 * 2. Intersección de tokens (>= 3 letras): "Man City" ~ "Manchester City".
 */
export function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const formsA = expandAlias(na);
  const formsB = expandAlias(nb);
  if (formsA.some((fa) => formsB.includes(fa))) return true;

  const tokensA = new Set(nameTokens(a));
  const tokensB = new Set(nameTokens(b));
  for (const t of tokensA) {
    if (tokensB.has(t)) return true;
  }
  return false;
}

/**
 * Encuentra el partido en vivo que corresponde a una apuesta.
 * Cascada: match exacto por teamId (del autocomplete) -> matching difuso
 * por nombres (alias + tokens) en ambos sentidos local/visitante.
 */
export function findFixtureForBet(
  bet: Bet,
  fixtures: LiveFixture[],
): LiveFixture | null {
  const homeId = bet.match.homeTeamId;
  const awayId = bet.match.awayTeamId;

  if (homeId && awayId) {
    const byId = fixtures.find(
      (f) =>
        (f.homeTeamId === homeId && f.awayTeamId === awayId) ||
        (f.homeTeamId === awayId && f.awayTeamId === homeId),
    );
    if (byId) return byId;
  }

  const home = bet.match.homeTeam;
  const away = bet.match.awayTeam;
  if (!home || !away) return null;

  return (
    fixtures.find((f) => {
      const direct =
        namesMatch(f.homeTeam, home) && namesMatch(f.awayTeam, away);
      const swapped =
        namesMatch(f.homeTeam, away) && namesMatch(f.awayTeam, home);
      return direct || swapped;
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
  // Si la categoría no viene en stats (proveedor sin ese dato), null:
  // nunca se auto-marca con ceros inventados.
  if (/corner/.test(text)) {
    return stats?.corners ? stats.corners.total : null;
  }
  if (/tarjeta|card/.test(text)) {
    return stats?.cards ? stats.cards.total : null;
  }
  if (/tiro|remate|shot/.test(text)) {
    return stats?.shotsOnTarget ? stats.shotsOnTarget.total : null;
  }
  if (/falta|foul/.test(text)) {
    return stats?.fouls ? stats.fouls.total : null;
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
    case 'LIVE':
      status = 'LIVE';
      period = current.period ?? '1H';
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
    case 'POSTPONED':
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
 * true si la apuesta tiene condiciones que dependen de estadísticas
 * granulares (córners/tarjetas/remates/faltas) y por lo tanto justifica
 * pedir el endpoint de stats. Las de goles se resuelven con el marcador.
 */
export function needsStats(bet: Bet): boolean {
  return bet.conditions.some((c) => {
    const text = normalizeName(`${c.market} ${c.selection}`);
    return /corner|tarjeta|card|tiro|remate|shot|falta|foul/.test(text);
  });
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
    // Anuladas por suspensión: quedan congeladas (aportan cuota 1.0)
    if (cond.status === 'VOID') return cond;
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
