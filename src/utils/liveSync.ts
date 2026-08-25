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

/**
 * Vínculo partido<->pata para builders de más de un partido.
 * `primary` es el partido principal de la apuesta (cabecera de la tarjeta);
 * `byCondition` asigna cada pata al partido que menciona en su texto:
 * si una pata nombra al equipo de otro partido del boleto, trackea ese.
 */
export interface BetFixtureLinks {
  primary: LiveFixture | null;
  byCondition: Map<string, LiveFixture>;
}

/**
 * Resuelve el partido de cada pata. Las patas genéricas ("Más de 4.5
 * córners") heredan el partido principal; las que mencionan otro equipo
 * del boleto se vinculan a su propio partido.
 */
export function findFixturesForBet(
  bet: Bet,
  fixtures: LiveFixture[],
): BetFixtureLinks {
  const primary = findFixtureForBet(bet, fixtures);
  const byCondition = new Map<string, LiveFixture>();
  for (const cond of bet.conditions) {
    // 1. Matching EXACTO: la pata declara sus equipos (builder multi-partido)
    if (cond.match?.homeTeam && cond.match?.awayTeam) {
      const declared = fixtures.find(
        (f) =>
          (namesMatch(f.homeTeam, cond.match!.homeTeam) &&
            namesMatch(f.awayTeam, cond.match!.awayTeam)) ||
          (namesMatch(f.homeTeam, cond.match!.awayTeam) &&
            namesMatch(f.awayTeam, cond.match!.homeTeam)),
      );
      if (declared && declared !== primary) {
        byCondition.set(cond.id, declared);
        continue;
      }
    }
    // 2. Heurística por texto: menciona al equipo de otro partido
    const text = `${cond.market} ${cond.selection}`;
    const mentioned = fixtures.find(
      (f) => namesMatch(f.homeTeam, text) || namesMatch(f.awayTeam, text),
    );
    if (mentioned && mentioned !== primary) byCondition.set(cond.id, mentioned);
  }
  return { primary, byCondition };
}

/** Partidos únicos vinculados a la apuesta (el principal primero). */
export function linkedFixturesOf(links: BetFixtureLinks): LiveFixture[] {
  const seen = new Set<number>();
  const out: LiveFixture[] = [];
  for (const f of [links.primary, ...links.byCondition.values()]) {
    if (!f?.fixtureId || seen.has(f.fixtureId)) continue;
    seen.add(f.fixtureId);
    out.push(f);
  }
  return out;
}

const totalGoals = (fixture: LiveFixture): number =>
  fixture.homeScore + fixture.awayScore;

/**
 * Mapea una condición numérica a la estadística TOTAL del partido que le
 * corresponde. Devuelve null para condiciones no mapeables automáticamente
 * (props de jugador, condiciones por equipo o de resultado).
 */
/**
 * Categorías de mercado que la app puede trackear con la API.
 * Es la fuente única de verdad: la usan el tracker (statForCondition),
 * el formulario (isAutoTrackable) y la tarjeta (chip de mercado).
 */
export type ApiStatCategory =
  | 'corners'
  | 'cards'
  | 'shotsOnTarget'
  | 'shots'
  | 'fouls'
  | 'goals';

/** Nombre canónico del mercado tal como lo reporta la API. */
export const API_MARKET_LABELS: Record<ApiStatCategory, string> = {
  corners: 'Córners del partido',
  cards: 'Tarjetas',
  shotsOnTarget: 'Tiros al arco',
  shots: 'Tiros totales',
  fouls: 'Faltas',
  goals: 'Goles del partido',
};

const PLAYER_PROP_RE = /jugador|player|props/;

// Mercados por período: las fuentes gratis no publican stats por mitad,
// así que se declaran manuales (nunca se trackean con el total del partido).
const HALF_RE = /1er|primer|primera|2do|segund|mitad|half/;
// Lado explícito en el texto del mercado
const HOME_RE = /local|home/;
const AWAY_RE = /visitante|away/;

/** Equipo de un mercado por equipo ('Córners - Local'). */
export type MarketSide = 'home' | 'away';

export interface ResolvedMarket {
  category: ApiStatCategory;
  /** Lado si el texto lo declara; si falta, se infiere de los equipos. */
  side?: MarketSide;
}

/**
 * Detecta a qué categoría de la API corresponde una condición según su texto.
 * null = sin coincidencia (seguimiento manual). Orden de detección importa:
 * "al arco" antes que "tiros" genérico, córners/tarjetas antes que goles.
 */
export function detectApiCategory(
  market: string,
  selection: string,
): ApiStatCategory | null {
  return resolveMarket(market, selection)?.category ?? null;
}

/**
 * Resolución completa de un mercado: categoría + lado (por equipo).
 * Devuelve null para lo NO trackeable con datos reales:
 * - props de jugador (ninguna fuente gratis da stats individuales)
 * - mercados por período/mitad (sin datos en fuentes gratis)
 * Categoría sin lado explícito = total del partido.
 */
export function resolveMarket(
  market: string,
  selection: string,
): ResolvedMarket | null {
  const text = normalizeName(`${market} ${selection}`);
  if (!text) return null;
  if (PLAYER_PROP_RE.test(text)) return null;
  if (HALF_RE.test(text)) return null;

  const side = HOME_RE.test(text)
    ? 'home'
    : AWAY_RE.test(text)
      ? 'away'
      : undefined;

  if (/corner/.test(text)) return { category: 'corners', side };
  if (/tarjeta|card/.test(text)) return { category: 'cards', side };
  if (/alarco|apuerta|ontarget|sot|encuadrado/.test(text))
    return { category: 'shotsOnTarget', side };
  if (/tiro|remate|shot|chance/.test(text)) return { category: 'shots', side };
  if (/falta|foul/.test(text)) return { category: 'fouls', side };
  if (/gol|goal/.test(text)) return { category: 'goals', side };
  return null;
}

/**
 * Infiere el lado de un mercado por equipo cuando el texto no lo dice:
 * primero por los equipos declarados de la pata (builders multi-partido),
 * luego por los nombres de los equipos del fixture. Solo si el match es
 * único (un solo equipo mencionado); si hay ambigüedad, undefined.
 */
function inferSideFromTeams(
  cond: BetCondition,
  fixture: LiveFixture,
): MarketSide | undefined {
  const declared = cond.match;
  if (declared?.homeTeam && declared.awayTeam) {
    if (namesMatch(declared.homeTeam, cond.selection)) return 'home';
    if (namesMatch(declared.awayTeam, cond.selection)) return 'away';
  }
  const homeHit = namesMatch(fixture.homeTeam, cond.selection);
  const awayHit = namesMatch(fixture.awayTeam, cond.selection);
  if (homeHit && !awayHit) return 'home';
  if (awayHit && !homeHit) return 'away';
  return undefined;
}

export function statForCondition(
  cond: BetCondition,
  fixture: LiveFixture,
  stats: LiveFixtureStats | null,
): number | null {
  if (!isNumericCondition(cond)) return null;

  const resolved = resolveMarket(cond.market, cond.selection);
  if (!resolved) return null;
  const { category, side: hint } = resolved;
  const side = hint ?? inferSideFromTeams(cond, fixture);

  // Si la categoría o el lado no vienen en stats (proveedor sin ese dato),
  // null: nunca se auto-marca con ceros inventados.
  switch (category) {
    case 'corners': {
      const c = stats?.corners;
      if (!c) return null;
      return side ? (c[side] ?? null) : c.total;
    }
    case 'cards': {
      const c = stats?.cards;
      if (!c) return null;
      return side ? (c[side] ?? null) : c.total;
    }
    case 'shotsOnTarget': {
      const c = stats?.shotsOnTarget;
      if (!c) return null;
      return side ? (c[side] ?? null) : c.total;
    }
    case 'shots': {
      const c = stats?.shots;
      if (!c) return null;
      return side ? (c[side] ?? null) : c.total;
    }
    case 'fouls': {
      const c = stats?.fouls;
      if (!c) return null;
      return side ? (c[side] ?? null) : c.total;
    }
    case 'goals':
      // "Más/Menos de X goles": total del partido o goles del equipo
      if (side === 'home') return fixture.homeScore;
      if (side === 'away') return fixture.awayScore;
      return totalGoals(fixture);
    default:
      return null;
  }
}

/**
 * true si la condición será trackeada automáticamente por el sync.
 */
export function isAutoTrackable(market: string, selection: string): boolean {
  return detectApiCategory(market, selection) !== null;
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
 * true si la condición depende de estadísticas granulares (córners,
 * tarjetas, remates, faltas). Las de goles se resuelven con el marcador.
 */
export function conditionNeedsStats(cond: BetCondition): boolean {
  const text = normalizeName(`${cond.market} ${cond.selection}`);
  return /corner|tarjeta|card|tiro|remate|shot|falta|foul/.test(text);
}

/** true si alguna pata de la apuesta necesita el endpoint de stats. */
export function needsStats(bet: Bet): boolean {
  return bet.conditions.some(conditionNeedsStats);
}

/**
 * Aplica los datos reales a una apuesta LIVE, con soporte multi-partido:
 * cada pata usa su propio partido (y sus stats); las genéricas usan el
 * principal. Función pura: no auto-asienta la apuesta (WON/LOST sigue
 * siendo manual); solo actualiza marcador, minuto y valores/estados.
 */
export function applyLiveUpdate(
  bet: Bet,
  links: BetFixtureLinks,
  statsByRef: Map<string, LiveFixtureStats | null>,
): LiveSyncResult {
  if (bet.status !== 'LIVE') return { bet, newHits: [] };
  const primary = links.primary;
  if (!primary) return { bet, newHits: [] };

  const newHits: string[] = [];
  const minuteNum =
    parseInt(primary.minute.replace(/[^0-9]/g, ''), 10) || 0;

  const newConditions = bet.conditions.map((cond): BetCondition => {
    // Anuladas por suspensión: quedan congeladas (aportan cuota 1.0)
    if (cond.status === 'VOID') return cond;
    // La pata puede pertenecer a OTRO partido del builder
    const fixture = links.byCondition.get(cond.id) ?? primary;
    const stats = fixture.statsRef
      ? (statsByRef.get(fixture.statsRef) ?? null)
      : null;
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
      match: mapMatchInfo(primary, bet.match),
      cashoutValue: computeCashout(bet, newConditions),
      conditions: newConditions,
    },
    newHits,
  };
}
