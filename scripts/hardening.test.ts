/**
 * Suite de hardening de LA FIJA (sin dependencias externas).
 * Corre con: npm test
 * Bundled con rolldown (ya presente via vite) y ejecutado con node.
 */
import { effectiveOdds } from '../src/types/bet';
import type { Bet, BetCondition } from '../src/types/bet';
import {
  applyLiveUpdate,
  findFixtureForBet,
  namesMatch,
  needsStats,
  normalizeName,
  statForCondition,
} from '../src/utils/liveSync';
import type { LiveFixture } from '../src/services/sportsApi';
import { sanitizeBets, sanitizeNotes } from '../src/utils/sanitize';
import { computeUserStats } from '../src/utils/stats';
import { applyConditionDelta, computeCashout } from '../src/utils/simulation';
import { formatOdds, parseInputToDecimal } from '../src/utils/odds';

// ---- Mini framework ---------------------------------------------------------

let passed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    console.log(`FAIL  ${name}`);
  }
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function assertFinite(obj: Record<string, unknown>, msg: string): void {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') {
      assert(Number.isFinite(v), `${msg}: campo ${k} no es finito (${v})`);
    }
  }
}

// ---- Builders ---------------------------------------------------------------

function cond(partial: Partial<BetCondition>): BetCondition {
  return {
    id: 'c1',
    market: 'Goles Totales',
    selection: 'Más de 2.5',
    targetValue: 2.5,
    currentValue: 0,
    progress: 0,
    status: 'PENDING',
    isLock: false,
    ...partial,
  };
}

function bet(partial: Partial<Bet>): Bet {
  return {
    id: 'b1',
    title: 'Test',
    sport: 'football',
    league: 'arg.1',
    type: 'single',
    match: {
      homeTeam: 'Boca Juniors',
      awayTeam: 'River Plate',
      homeScore: 0,
      awayScore: 0,
      minute: "10'",
      status: 'LIVE',
      startTime: '',
      league: 'Liga Profesional',
    },
    stake: 100,
    odds: 2.0,
    potentialPayout: 200,
    bookmaker: 'Bet365',
    status: 'PENDING',
    cashoutValue: null,
    conditions: [],
    createdAt: new Date().toISOString(),
    tags: [],
    ...partial,
  };
}

function fixture(partial: Partial<LiveFixture>): LiveFixture {
  return {
    fixtureId: 1,
    provider: 'test',
    league: 'Liga',
    minute: "30'",
    statusShort: 'LIVE',
    homeTeam: 'Boca Juniors',
    awayTeam: 'River Plate',
    homeScore: 1,
    awayScore: 1,
    startTime: '',
    ...partial,
  };
}

// ---- 1. effectiveOdds (lógica financiera) -----------------------------------

console.log('\n[1] effectiveOdds');

test('sin cuotas individuales -> cuota total', () => {
  const b = bet({ odds: 3.5, conditions: [cond({})] });
  assert(effectiveOdds(b) === 3.5, 'debe devolver bet.odds');
});

test('mezcla activas -> producto de no anuladas', () => {
  const b = bet({
    odds: 99,
    conditions: [
      cond({ id: 'a', odds: 1.5 }),
      cond({ id: 'b', odds: 2 }),
      cond({ id: 'v', odds: 4, status: 'VOID' }),
    ],
  });
  assert(Math.abs(effectiveOdds(b) - 3) < 1e-9, `esperaba 3, dio ${effectiveOdds(b)}`);
});

test('todas VOID -> 1 (reembolso)', () => {
  const b = bet({
    odds: 10,
    conditions: [
      cond({ id: 'a', odds: 5, status: 'VOID' }),
      cond({ id: 'b', odds: 2, status: 'VOID' }),
    ],
  });
  assert(effectiveOdds(b) === 1, `esperaba 1, dio ${effectiveOdds(b)}`);
});

test('cuota cero o negativa se trata como ausente', () => {
  const b = bet({
    odds: 2.5,
    conditions: [
      cond({ id: 'a', odds: 0 }),
      cond({ id: 'b', odds: -3 }),
      cond({ id: 'c', odds: NaN }),
    ],
  });
  assert(effectiveOdds(b) === 2.5, `esperaba 2.5, dio ${effectiveOdds(b)}`);
});

test('cuota Infinity no envenena el producto', () => {
  const b = bet({
    odds: 2,
    conditions: [cond({ id: 'a', odds: Number.NaN })],
  });
  assert(Number.isFinite(effectiveOdds(b)), 'debe ser finito');
});

// ---- 2. sanitizeBets / sanitizeNotes (datos podridos) ------------------------

console.log('\n[2] sanitización de datos');

test('basura total -> array vacío sin lanzar', () => {
  assert(sanitizeBets(null).length === 0, 'null');
  assert(sanitizeBets('hola').length === 0, 'string');
  assert(sanitizeBets({}).length === 0, 'objeto');
  assert(sanitizeBets([undefined, null, 42, 'x']).length === 0, 'items basura');
});

test('bet sin conditions ni match se repara', () => {
  const [b] = sanitizeBets([{ id: 'x', stake: '50', odds: 'abc', status: 'NO_EXISTO', match: null }]);
  assert(Boolean(b), 'debe producir un bet');
  assert(Array.isArray(b.conditions), 'conditions debe ser array');
  assert(b.stake === 0, `stake string debe ir a 0, dio ${b.stake}`);
  assert(b.odds >= 1, `odds debe ser >= 1, dio ${b.odds}`);
  assert(b.status === 'PENDING', 'status inválido debe ir a PENDING');
});

test('stake negativo y NaN se rechazan', () => {
  const [b] = sanitizeBets([
    { id: 'x', stake: -100, odds: Number.NaN, conditions: [], match: {} },
  ]);
  assert(b.stake === 0, 'stake negativo -> 0');
  assert(b.odds >= 1, 'odds NaN -> minimo 1');
});

test('condiciones corruptas se descartan sin romper el bet', () => {
  const [b] = sanitizeBets([
    {
      id: 'x',
      conditions: [null, { id: '', market: 'x' }, { id: 'ok', progress: 999 }, 'junk'],
      match: {},
    },
  ]);
  assert(b.conditions.length === 1, `esperaba 1 condición válida, dio ${b.conditions.length}`);
  assert(b.conditions[0].progress === 100, 'progress fuera de rango se clampea');
});

test('tags no-string se filtran', () => {
  const [b] = sanitizeBets([{ id: 'x', tags: ['ok', 5, null], conditions: [] }]);
  assert(b.tags.length === 1 && b.tags[0] === 'ok', 'solo strings');
});

test('notes podridas -> reparadas o descartadas', () => {
  const notes = sanitizeNotes([null, { id: '' }, { id: 'n1' }, { id: 'n2', pinned: 'yes', createdAt: 5 }]);
  assert(notes.length === 2, `esperaba 2, dio ${notes.length}`);
  assert(notes[1].pinned === false, 'pinned string -> false');
  assert(typeof notes[1].createdAt === 'string', 'createdAt debe ser string');
});

// ---- 3. computeUserStats (división por cero, finitud) ------------------------

console.log('\n[3] estadísticas financieras');

test('sin apuestas: todo finito, nivel 1', () => {
  const s = computeUserStats([], 500);
  assertFinite(s as unknown as Record<string, unknown>, 'stats vacías');
  assert(s.rankLevel === 1, `nivel esperado 1, dio ${s.rankLevel}`);
  assert(s.roi === 0 && s.winRate === 0, 'ratios en cero');
});

test('bankroll 0 no produce NaN/Infinity', () => {
  const s = computeUserStats(
    [bet({ status: 'WON', potentialPayout: 200 })],
    0,
  );
  assertFinite(s as unknown as Record<string, unknown>, 'bankroll 0');
});

test('stakes gigantes no rompen el ELO', () => {
  const s = computeUserStats(
    [bet({ status: 'LOST', stake: 1e15 }), bet({ status: 'WON', stake: 1, potentialPayout: 2 })],
    1000,
  );
  assertFinite(s as unknown as Record<string, unknown>, 'elo extremo');
  assert(s.rankLevel >= 1 && s.rankLevel <= 10, 'nivel dentro de rango');
});

test('fechas inválidas en createdAt no crashean la racha', () => {
  const s = computeUserStats(
    [
      bet({ id: 'a', status: 'WON', createdAt: 'no-es-fecha' }),
      bet({ id: 'b', status: 'LOST', createdAt: 'tampoco' }),
    ],
    100,
  );
  assertFinite(s as unknown as Record<string, unknown>, 'racha con fechas basura');
});

// ---- 4. matching de equipos hostil -------------------------------------------

console.log('\n[4] matching de equipos');

test('unicode y acentos normalizan igual', () => {
  assert(namesMatch('Atlético Madrid', 'atletico madrid'), 'acentos');
  assert(namesMatch('Ñublense⚡FC', 'nublense fc'), 'emoji+ñ');
});

test('strings vacíos nunca matchean', () => {
  assert(!namesMatch('', ''), 'vacíos');
  assert(!namesMatch('   ', '///'), 'solo ruido');
});

test('bet sin nombres de equipos devuelve null', () => {
  const b = bet({ match: { ...bet({}).match, homeTeam: '', awayTeam: '' } });
  assert(findFixtureForBet(b, [fixture({})]) === null, 'null sin nombres');
});

test('match por id aunque los nombres difieran del todo', () => {
  const b = bet({
    match: {
      ...bet({}).match,
      homeTeamId: 777,
      awayTeamId: 888,
      homeTeam: 'ZZZ',
      awayTeam: 'YYY',
    },
  });
  const f = findFixtureForBet(b, [fixture({ homeTeamId: 777, awayTeamId: 888, homeTeam: 'QQQ', awayTeam: 'WWW' })]);
  assert(f !== null, 'debe matchear por ids');
});

test('partido con local=visitante invertido también matchea', () => {
  const b = bet({});
  const f = findFixtureForBet(b, [fixture({ homeTeam: 'River Plate', awayTeam: 'Boca Juniors' })]);
  assert(f !== null, 'swap debe matchear');
});

test('10 mil caracteres no tira el matcher', () => {
  const huge = 'x'.repeat(10_000);
  const b = bet({ match: { ...bet({}).match, homeTeam: huge, awayTeam: huge } });
  const start = Date.now();
  findFixtureForBet(b, [fixture()]);
  assert(Date.now() - start < 2000, 'matching debe terminar rápido');
});

test('normalizeName con entrada hostil es estable', () => {
  assert(normalizeName('⚽🏆') === '', 'emojis');
  assert(normalizeName('---') === '', 'puntuación');
});

// ---- 5. needsStats + statForCondition (datos parciales) ----------------------

console.log('\n[5] stats bajo demanda');

test('goles NO pide stats', () => {
  const b = bet({ conditions: [cond({ market: 'Goles Totales', selection: 'Más de 2.5' })] });
  assert(!needsStats(b), 'goles usa marcador');
});

test('córners/tarjetas/remates/faltas SÍ piden stats', () => {
  for (const sel of ['Más de 8.5 Córners', 'Menos de 3 tarjetas', 'Vinicius 2+ tiros a puerta', 'Más de 20 faltas']) {
    const b = bet({ conditions: [cond({ market: 'Props', selection: sel })] });
    assert(needsStats(b), `${sel} debe pedir stats`);
  }
});

test('stats parciales: categoría ausente -> null (nunca cero inventado)', () => {
  const b = bet({ conditions: [cond({ market: 'Córners', selection: 'Más de 8.5', targetValue: 8.5, currentValue: 0 })] });
  // Stats que solo traen tarjetas (caso SportScore con incidents)
  const partial: LiveFixtureStats = {
    fixtureId: 1,
    homeTeam: '',
    awayTeam: '',
    cards: { yellow: 2, red: 0, total: 2 },
  };
  const cornersVal = statForCondition(b.conditions[0], fixture(), partial);
  assert(cornersVal === null, `córnners ausentes deben dar null, dio ${cornersVal}`);

  const cardCond = cond({ market: 'Tarjetas', selection: 'Menos de 3', targetValue: 3, currentValue: 0 });
  assert(statForCondition(cardCond, fixture(), partial) === 2, 'tarjetas presentes dan valor real');
});

test('stats completos en cero SON válidos (0-0 córners reales)', () => {
  const b = bet({ conditions: [cond({ market: 'Córners', selection: 'Más de 8.5', targetValue: 8.5, currentValue: 0 })] });
  const full: LiveFixtureStats = {
    fixtureId: 1,
    homeTeam: '',
    awayTeam: '',
    corners: { home: 0, away: 0, total: 0 },
  };
  const v = statForCondition(b.conditions[0], fixture(), full);
  assert(v === 0, `cero real debe respetarse, dio ${String(v)}`);
});

// ---- 6. applyLiveUpdate (auto-tracking) --------------------------------------

console.log('\n[6] applyLiveUpdate');

test('apuesta no LIVE queda intacta', () => {
  const b = bet({ status: 'PENDING' });
  const r = applyLiveUpdate(b, fixture({ homeScore: 5, awayScore: 4 }), null);
  assert(r.bet === b, 'no debe tocar la apuesta');
  assert(r.newHits.length === 0, 'sin hits');
});

test('condición de goles se marca con el marcador', () => {
  const b = bet({
    status: 'LIVE',
    conditions: [
      cond({ id: 'g', market: 'Goles Totales', selection: 'Más de 2.5 goles', targetValue: 3, currentValue: 1 }),
    ],
  });
  const r = applyLiveUpdate(b, fixture({ homeScore: 2, awayScore: 1 }), null);
  assert(r.bet.conditions[0].status === 'MET', 'debe pasar a MET');
  assert(r.bet.conditions[0].currentValue === 3, 'currentValue = total goles');
  assert(r.newHits.includes('Más de 2.5 goles'), 'debe registrar hit');
});

test('stats null: condición de córners NO avanza ni se inventa cero', () => {
  const b = bet({
    status: 'LIVE',
    conditions: [
      cond({ id: 'c', market: 'Córners', selection: 'Más de 8.5 córners', targetValue: 9, currentValue: 4 }),
    ],
  });
  const r = applyLiveUpdate(b, fixture(), null);
  assert(r.bet.conditions[0].currentValue === 4, 'valor congelado');
  assert(r.newHits.length === 0, 'sin hits');
});

test('condiciones VOID quedan congeladas aunque haya datos', () => {
  const before = cond({ id: 'v', market: 'Córners', selection: 'X', targetValue: 5, currentValue: 1, status: 'VOID' });
  const b = bet({ status: 'LIVE', conditions: [before] });
  const full: LiveFixtureStats = {
    fixtureId: 1, homeTeam: '', awayTeam: '',
    corners: { home: 6, away: 3, total: 9 },
  };
  const r = applyLiveUpdate(b, fixture(), full);
  assert(r.bet.conditions[0].currentValue === 1, 'VOID no cambia');
  assert(r.newHits.length === 0, 'sin hits en VOID');
});

test('regresión del valor real no rebaja el progreso ya logrado', () => {
  const b = bet({
    status: 'LIVE',
    conditions: [
      cond({ id: 'g', market: 'Goles Totales', selection: 'Más de 1.5', targetValue: 2, currentValue: 2, status: 'MET', isLock: true }),
    ],
  });
  // El feed retrocede el marcador a 0-0 (glitch de proveedor)
  const r = applyLiveUpdate(b, fixture({ homeScore: 0, awayScore: 0 }), null);
  assert(r.bet.conditions[0].currentValue === 2, 'no debe rebajar');
});

test('POSTPONED del feed llega al matchInfo', () => {
  const b = bet({ status: 'LIVE' });
  const r = applyLiveUpdate(b, fixture({ statusShort: 'POSTPONED' }), null);
  assert(r.bet.match.status === 'POSTPONED', `esperaba POSTPONED, dio ${r.bet.match.status}`);
});

// ---- 7. cashout y deltas manuales ---------------------------------------------

console.log('\n[7] simulación y cashout');

test('cashout sin condiciones = stake', () => {
  const b = bet({ stake: 100, odds: 3 });
  assert(computeCashout(b, []) === 100, 'debe devolver el stake');
});

test('cashout con todo MET crece hacia la cuota', () => {
  const b = bet({ stake: 100, odds: 3 });
  const cs = computeCashout(b, [
    cond({ id: 'a', status: 'MET' }),
    cond({ id: 'b', status: 'MET' }),
  ]);
  assert(cs > 100 && cs <= 300, `cashout fuera de rango: ${cs}`);
});

test('delta alcanza objetivo -> apuesta pasa a WON', () => {
  const b = bet({
    status: 'LIVE',
    conditions: [cond({ id: 'x', targetValue: 2, currentValue: 1 })],
  });
  const r = applyConditionDelta(b, 'x', 1);
  assert(r.status === 'WON', `esperaba WON, dio ${r.status}`);
  assert(r.conditions[0].isLock === true, 'bloqueada al cumplirse');
});

test('delta negativo no baja de cero y des-asienta WON', () => {
  const b = bet({
    status: 'WON',
    conditions: [cond({ id: 'x', targetValue: 1, currentValue: 1, status: 'MET' })],
  });
  const r = applyConditionDelta(b, 'x', -5);
  assert(r.conditions[0].currentValue === 0, 'clamp a cero');
  assert(r.status === 'LIVE', `WON debe revertir a LIVE, dio ${r.status}`);
});

test('condición inexistente o textual no explota', () => {
  const b = bet({
    status: 'LIVE',
    conditions: [cond({ id: 't', market: 'Resultado', selection: 'Local', targetValue: '1X', currentValue: '1X' })],
  });
  const r = applyConditionDelta(b, 'no-existe', 1);
  assert(r.conditions.length === 1, 'intacta');
  const r2 = applyConditionDelta(b, 't', 1);
  assert(r2.conditions[0].currentValue === '1X', 'textual sin cambios');
});

// ---- 8. formato de cuotas hostil ----------------------------------------------

console.log('\n[8] formato de cuotas');

test('formatos nunca devuelven NaN/Infinity como texto', () => {
  for (const odd of [Number.NaN, Infinity, -Infinity, -5, 0, 1e300]) {
    for (const fmt of ['decimal', 'american', 'fractional', 'implied'] as const) {
      const s = formatOdds(odd, fmt);
      assert(!/nan|infinity/i.test(s), `formatOdds(${odd}, ${fmt}) -> "${s}"`);
      assert(typeof s === 'string' && s.length > 0, `salida vacía para ${odd}/${fmt}`);
    }
  }
});

test('parseo rechaza basura en todos los formatos', () => {
  for (const bad of ['abc', '', '  ', '-3', '<script>', '2;drop table']) {
    for (const fmt of ['decimal', 'american', 'fractional', 'implied'] as const) {
      const v = parseInputToDecimal(bad, fmt);
      assert(v === null || (Number.isFinite(v) && v >= 1), `"${bad}" (${fmt}) -> ${v}`);
    }
  }
});

test('parseo acepta variantes legítimas', () => {
  assert(parseInputToDecimal('2,50', 'decimal') === 2.5, 'coma decimal');
  assert(parseInputToDecimal('+150', 'american') === 2.5, 'americana positiva');
  assert(parseInputToDecimal('-200', 'american') === 1.5, 'americana negativa');
  assert(parseInputToDecimal('3/2', 'fractional') === 2.5, 'fraccional');
  assert(parseInputToDecimal('40%', 'implied') === 2.5, 'implícita');
});

// ---- 9. prototype pollution y caps ---------------------------------------------

console.log('\n[9] ataques de objeto');

test('__proto__ en JSON no contamina Object.prototype', () => {
  const evil = JSON.parse(
    '{"__proto__":{"polluted":true},"id":"x","conditions":[]}',
  ) as unknown;
  sanitizeBets(evil);
  assert(({} as Record<string, unknown>).polluted === undefined, 'Object.prototype contaminado!');
});

test('constructor/toString como claves no rompen', () => {
  const out = sanitizeBets([
    { id: 'constructor', constructor: { prototype: { x: 1 } }, conditions: [] },
    { id: 'hasOwnProperty', __proto__: null },
  ]);
  assert(out.every((b) => typeof b.id === 'string'), 'ids sobreviven como strings');
});

test('montos absurdos quedan dentro de límites finitos', () => {
  const [b] = sanitizeBets([
    { id: 'x', stake: 1e15, odds: 1e10, potentialPayout: 1e20, cashoutValue: -50, conditions: [], match: {} },
  ]);
  assert(Number.isFinite(b.stake) && b.stake <= 1e9, `stake sin cap: ${b.stake}`);
  assert(Number.isFinite(b.odds) && b.odds <= 1e6, `odds sin cap: ${b.odds}`);
  assert(Number.isFinite(b.potentialPayout) && b.potentialPayout <= 1e12, 'payout sin cap');
  assert(b.cashoutValue === null, 'cashout negativo -> null');
});

// ---- Resumo -----------------------------------------------------------------

console.log(`\n${passed} tests OK, ${failures.length} fallos`);
if (failures.length > 0) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
