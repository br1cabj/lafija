import React, { useState } from 'react';
import { useBets } from '../context/BetContext';
import type {
  BetCondition,
  BetType,
  ConditionStatus,
  ConditionMatch,
  SportType,
} from '../types/bet';
import { POPULAR_BOOKMAKERS, getSuperSubLabel } from '../data/bookmakers';
import {
  API_MARKET_LABELS,
  detectApiCategory,
} from '../utils/liveSync';
import { SPORT_OPTIONS } from '../data/sports';
import { KNOWN_MARKETS } from '../data/markets';
import {
  parseInputToDecimal,
  type OddsFormat,
  decimalToAmerican,
  decimalToFractional,
  decimalToImpliedProbability,
  convertOddsInput,
} from '../utils/odds';
import { Modal } from './ui/Modal';
import { OddsFormatTabs } from './ui/OddsFormatTabs';
import { TeamInput } from './ui/TeamInput';
import {
  Plus,
  Trash2,
  Zap,
  Radio,
  Calendar,
  AlertCircle,
  Check,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';

type ConditionField = keyof Pick<
  BetCondition,
  'market' | 'selection' | 'currentValue' | 'targetValue' | 'odds'
>;

/** Fila en blanco para empezar a cargar condiciones desde cero. */
const EMPTY_CONDITION: Omit<BetCondition, 'id'> = {
  market: '',
  selection: '',
  targetValue: 1,
  currentValue: 0,
  progress: 0,
  status: 'PENDING',
  isLock: false,
};

/**
 * Grupo de condiciones que comparten un mismo partido. En builders
 * multi-partido cada grupo declara sus equipos para el tracking exacto.
 */
interface ConditionGroup {
  key: number;
  homeTeam: string;
  awayTeam: string;
  homeTeamId?: number;
  awayTeamId?: number;
  conditions: Omit<BetCondition, 'id'>[];
}

let groupKeySeq = 1;
const newGroup = (): ConditionGroup => ({
  key: groupKeySeq++,
  homeTeam: '',
  awayTeam: '',
  conditions: [{ ...EMPTY_CONDITION }],
});

/** Pasos del wizard: 1 partido, 2 selecciones, 3 detalles de la apuesta. */
type WizardStep = 1 | 2 | 3;

const STEPS: { n: WizardStep; label: string }[] = [
  { n: 1, label: 'Partido' },
  { n: 2, label: 'Selecciones' },
  { n: 3, label: 'Apuesta' },
];

interface AddBetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBetModal: React.FC<AddBetModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addBet, oddsFormat: globalOddsFormat } = useBets();

  const [matchStatus, setMatchStatus] = useState<'LIVE' | 'PENDING'>('LIVE');
  const [sport, setSport] = useState<SportType>('football');
  const [league, setLeague] = useState('');
  const [betType, setBetType] = useState<BetType>('bet_builder');
  const [stake, setStake] = useState('');
  const [inputOddsFormat, setInputOddsFormat] = useState<OddsFormat>(
    globalOddsFormat || 'decimal',
  );
  const [oddsInput, setOddsInput] = useState('');
  const [bookmaker, setBookmaker] = useState('');
  const [bookmakerRegion, setBookmakerRegion] = useState<'AR' | 'GLOBAL'>('AR');

  // Grupos por partido; el primero es el partido principal de la boleta
  const [groups, setGroups] = useState<ConditionGroup[]>([newGroup()]);
  // Wizard: paso actual y grupo que se está cargando/editando
  const [step, setStep] = useState<WizardStep>(1);
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);
  // Nota: el form se monta fresco en cada apertura (App renderiza
  // condicionalmente el modal), por lo que no hace falta resetear estado.

  const allowsMultipleMatches = betType !== 'single';
  const activeGroup = groups[Math.min(activeGroupIdx, groups.length - 1)];

  /** Grupo con equipos cargados y al menos una selección con texto. */
  const groupHasSelections = (g: ConditionGroup) =>
    g.conditions.some(
      (c) => c.selection.trim() !== '' || c.market.trim() !== '',
    );

  const teamFilled = (g: ConditionGroup) =>
    g.homeTeam.trim() !== '' && g.awayTeam.trim() !== '';

  // ---- Handlers de grupos -------------------------------------------------

  const handleAddGroup = () => {
    setGroups((prev) => [...prev, newGroup()]);
    setActiveGroupIdx(groups.length);
    setStep(1);
  };

  const handleRemoveGroup = (gIdx: number) => {
    setGroups((prev) => prev.filter((_, i) => i !== gIdx));
    setActiveGroupIdx((prev) => Math.max(0, prev >= gIdx ? prev - 1 : prev));
  };

  const handleTeamChange = (
    gIdx: number,
    side: 'home' | 'away',
    name: string,
    teamId?: number,
  ) =>
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gIdx
          ? {
              ...g,
              ...(side === 'home'
                ? { homeTeam: name, homeTeamId: teamId }
                : { awayTeam: name, awayTeamId: teamId }),
            }
          : g,
      ),
    );

  // ---- Handlers de condiciones ---------------------------------------------

  const recalcProgress = (
    cond: Omit<BetCondition, 'id'>,
  ): Omit<BetCondition, 'id'> => {
    const cur = Number(cond.currentValue) || 0;
    const tar = Number(cond.targetValue) || 1;
    const isMet = cur >= tar;
    const status: ConditionStatus = isMet
      ? 'MET'
      : matchStatus === 'PENDING'
        ? 'PENDING'
        : 'IN_PROGRESS';
    return {
      ...cond,
      progress: Math.min(100, Math.round((cur / tar) * 100)),
      status,
      isLock: isMet,
    };
  };

  const mutateConditions = (
    gIdx: number,
    fn: (conds: Omit<BetCondition, 'id'>[]) => Omit<BetCondition, 'id'>[],
  ) =>
    setGroups((prev) =>
      prev.map((g, i) => (i === gIdx ? { ...g, conditions: fn(g.conditions) } : g)),
    );

  const handleAddCondition = () =>
    mutateConditions(activeGroupIdx, (cs) => [...cs, { ...EMPTY_CONDITION }]);

  const handleRemoveCondition = (cIdx: number) =>
    mutateConditions(activeGroupIdx, (cs) => cs.filter((_, i) => i !== cIdx));

  const handleConditionChange = (
    cIdx: number,
    field: ConditionField,
    value: string | number,
  ) =>
    mutateConditions(activeGroupIdx, (cs) =>
      cs.map((c, i) => (i === cIdx ? recalcProgress({ ...c, [field]: value }) : c)),
    );

  const toggleSuperSub = (cIdx: number) =>
    mutateConditions(activeGroupIdx, (cs) =>
      cs.map((c, i) => (i === cIdx ? { ...c, superSub: !c.superSub } : c)),
    );

  const addPreset = (
    market: string,
    selection: string,
    targetValue: number,
    unit: string,
  ) =>
    mutateConditions(activeGroupIdx, (cs) => [
      ...cs,
      {
        market,
        selection,
        targetValue,
        currentValue: 0,
        progress: 0,
        unit,
        status: matchStatus === 'PENDING' ? 'PENDING' : 'IN_PROGRESS',
        isLock: false,
      },
    ]);

  // ---- Navegación del wizard ------------------------------------------------

  /** true si el paso es alcanzable según lo ya cargado. */
  const canGoToStep = (target: WizardStep): boolean => {
    if (target <= step) return true;
    if (target === 2) {
      // Necesita el partido activo con equipos cargados
      return teamFilled(groups[activeGroupIdx]);
    }
    if (target === 3) {
      return (
        teamFilled(activeGroup) &&
        groups.some(
          (g) => teamFilled(g) && groupHasSelections(g),
        )
      );
    }
    return false;
  };

  const goToStep = (target: WizardStep) => {
    if (!canGoToStep(target)) return;
    setStep(target);
  };

  // ---- Cuota / stake --------------------------------------------------------

  const handleFormatChange = (newFormat: OddsFormat) => {
    if (newFormat === inputOddsFormat) return;
    const converted = convertOddsInput(oddsInput, inputOddsFormat, newFormat);
    setInputOddsFormat(newFormat);
    if (converted) {
      setOddsInput(converted);
    }
  };

  // Cap anti-basura: 1e9 evita Infinity en payout y null silencioso en la nube
  const parsedStake = Math.min(parseFloat(stake.replace(',', '.')) || 0, 1e9);
  const parsedOdds = parseInputToDecimal(oddsInput, inputOddsFormat);
  const superSubLabel = getSuperSubLabel(bookmaker || 'Betsson');
  const oddsError =
    oddsInput.trim() !== '' && parsedOdds === null
      ? 'Cuota inválida para el formato seleccionado.'
      : null;
  const decimalOdds = parsedOdds ?? 1;
  const potentialPayout = parseFloat((parsedStake * decimalOdds).toFixed(2));

  const getOddsPlaceholder = () => {
    switch (inputOddsFormat) {
      case 'american':
        return '+150';
      case 'fractional':
        return '3/2';
      case 'implied':
        return '40%';
      case 'decimal':
      default:
        return '2.50';
    }
  };

  const canSave =
    parsedOdds !== null &&
    parsedStake > 0 &&
    groups.some((g) => teamFilled(g) && groupHasSelections(g));

  const doSubmit = () => {
    if (!canSave) return;

    const isLive = matchStatus === 'LIVE';

    // Descartar grupos sin condiciones cargadas
    const filledGroups = groups.filter(groupHasSelections);
    if (filledGroups.length === 0) return;

    const multiMatch = filledGroups.length > 1;
    const primary = filledGroups[0];

    // Cada pata lleva la referencia a su partido (tracking exacto);
    // con un solo grupo no hace falta (todo es el partido principal).
    const matchOf = (g: ConditionGroup): ConditionMatch | undefined => {
      if (!multiMatch) return undefined;
      return {
        homeTeam: g.homeTeam || 'Equipo Local',
        awayTeam: g.awayTeam || 'Equipo Visitante',
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
      };
    };

    let condSeq = 0;
    const mappedConditions: BetCondition[] = filledGroups.flatMap((g, gi) => {
      const ref = matchOf(g);
      return g.conditions
        .filter((c) => c.selection.trim() !== '' || c.market.trim() !== '')
        .map((c) => ({
          ...c,
          market: c.market.trim() || 'General',
          selection: c.selection.trim(),
          id: `cond-${Date.now()}-${condSeq++}`,
          status:
            c.status === 'MET' ? 'MET' : isLive ? 'IN_PROGRESS' : 'PENDING',
          ...(gi > 0 ? { match: ref } : {}),
        }));
    });

    const moreMatches = multiMatch ? ` +${filledGroups.length - 1}` : '';
    addBet({
      title: `${primary.homeTeam || 'Equipo 1'} vs ${primary.awayTeam || 'Equipo 2'}${moreMatches} // ${betType.toUpperCase()}`,
      sport,
      league: league || 'Liga Principal',
      type: betType,
      match: {
        homeTeam: primary.homeTeam || 'Equipo Local',
        awayTeam: primary.awayTeam || 'Equipo Visitante',
        homeTeamId: primary.homeTeamId,
        awayTeamId: primary.awayTeamId,
        homeScore: isLive ? 0 : undefined,
        awayScore: isLive ? 0 : undefined,
        minute: isLive ? "01'" : undefined,
        period: isLive ? '1H' : 'PRE',
        status: isLive ? 'LIVE' : 'SCHEDULED',
        startTime: new Date().toISOString(),
        league: league || 'Liga Principal',
      },
      stake: parsedStake,
      odds: decimalOdds,
      potentialPayout,
      bookmaker: bookmaker.trim() || 'Otra',
      status: isLive ? 'LIVE' : 'PENDING',
      cashoutValue: isLive ? parseFloat((parsedStake * 0.9).toFixed(2)) : null,
      conditions: mappedConditions,
      notes: '',
      tags: [sport, betType, bookmaker],
    });

    onClose();
  };

  // Grupos completos para el preview del paso 3
  const filledGroups = groups.filter(
    (g) => teamFilled(g) && groupHasSelections(g),
  );
  const totalSelections = filledGroups.reduce(
    (acc, g) =>
      acc +
      g.conditions.filter(
        (c) => c.selection.trim() !== '' || c.market.trim() !== '',
      ).length,
    0,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel='Registrar nueva apuesta'
      maxWidthClass='max-w-lg'
      fullscreenOnMobile
    >
      {/* Header compacto */}
      <div className='flex items-center gap-2.5 border-b border-white/10 pb-3 mb-3'>
        <div className='p-2 rounded bg-orange-500/20 text-brand'>
          <Zap className='w-5 h-5' />
        </div>
        <div>
          <h2 className='text-base lg:text-lg font-bold text-white uppercase tracking-wider font-mono'>
            Nueva Apuesta
          </h2>
          <p className='text-[11px] text-slate-400'>
            Paso {step} de 3 — {STEPS[step - 1].label}
          </p>
        </div>
      </div>

      {/* Barra de progreso clicable */}
      <ol className='mb-4 flex items-center gap-1'>
        {STEPS.map(({ n, label }, i) => {
          const reachable = canGoToStep(n);
          const isCurrent = step === n;
          const done = step > n;
          return (
            <React.Fragment key={n}>
              {i > 0 && (
                <span
                  className={`h-px flex-1 ${done || reachable ? 'bg-brand/50' : 'bg-white/10'}`}
                  aria-hidden
                />
              )}
              <li>
                <button
                  type='button'
                  onClick={() => goToStep(n)}
                  disabled={!reachable}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    isCurrent
                      ? 'bg-brand text-white'
                      : done
                        ? 'text-brand hover:bg-orange-500/10'
                        : reachable
                          ? 'text-slate-300 hover:bg-white/5'
                          : 'text-slate-600'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                      isCurrent
                        ? 'bg-white/25'
                        : done
                          ? 'bg-brand/20 text-brand'
                          : 'bg-white/10'
                    }`}
                  >
                    {done ? <Check className='h-2.5 w-2.5' /> : n}
                  </span>
                  {label}
                </button>
              </li>
            </React.Fragment>
          );
        })}
      </ol>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 3) doSubmit();
        }}
        className='space-y-4'
      >
        {/* Autocompletado nativo de mercados canónicos (compartido) */}
        <datalist id='abm-market-options'>
          {KNOWN_MARKETS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        {/* ================= PASO 1: PARTIDO ================= */}
        {step === 1 && (
          <>
            {/* En Vivo vs Pre-Partido */}
            <div className='flex bg-base p-1 rounded-lg border border-white/10 text-xs font-mono'>
              <button
                type='button'
                onClick={() => setMatchStatus('LIVE')}
                aria-pressed={matchStatus === 'LIVE'}
                className={`flex-1 py-1.5 rounded-md transition-all font-bold flex items-center justify-center gap-1.5 ${
                  matchStatus === 'LIVE'
                    ? 'bg-red-600 text-white shadow-sm shadow-red-950/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio
                  className={`w-3.5 h-3.5 ${matchStatus === 'LIVE' ? 'animate-pulse' : ''}`}
                />
                <span>En Vivo</span>
              </button>
              <button
                type='button'
                onClick={() => setMatchStatus('PENDING')}
                aria-pressed={matchStatus === 'PENDING'}
                className={`flex-1 py-1.5 rounded-md transition-all font-bold flex items-center justify-center gap-1.5 ${
                  matchStatus === 'PENDING'
                    ? 'bg-brand text-white shadow-sm shadow-orange-950/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className='w-3.5 h-3.5' />
                <span>Pre-Partido</span>
              </button>
            </div>

            {/* Deporte y tipo */}
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label
                  htmlFor='abm-sport'
                  className='text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1'
                >
                  Deporte
                </label>
                <select
                  id='abm-sport'
                  value={sport}
                  onChange={(e) => setSport(e.target.value as SportType)}
                  className='w-full bg-base border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-brand focus:outline-none'
                >
                  {SPORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor='abm-type'
                  className='text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1'
                >
                  Tipo de Apuesta
                </label>
                <select
                  id='abm-type'
                  value={betType}
                  onChange={(e) => setBetType(e.target.value as BetType)}
                  className='w-full bg-base border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-brand focus:outline-none'
                >
                  <option value='bet_builder'>Bet Builder / Combinada</option>
                  <option value='parlay'>Parlay (varios partidos)</option>
                  <option value='single'>Simple (1 selección)</option>
                </select>
              </div>
            </div>

            {/* Equipos del partido en curso */}
            {allowsMultipleMatches && groups.length > 1 && (
              <p className='text-[11px] font-bold tracking-wide text-brand uppercase font-mono'>
                Partido {activeGroupIdx + 1} de {groups.length}
              </p>
            )}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <TeamInput
                id={`abm-home-${activeGroup.key}`}
                label='Equipo Local / Jugador 1'
                value={activeGroup.homeTeam}
                onChange={(name, teamId) =>
                  handleTeamChange(activeGroupIdx, 'home', name, teamId)
                }
              />

              <TeamInput
                id={`abm-away-${activeGroup.key}`}
                label='Equipo Visitante / Jugador 2'
                value={activeGroup.awayTeam}
                onChange={(name, teamId) =>
                  handleTeamChange(activeGroupIdx, 'away', name, teamId)
                }
              />
            </div>

            {/* Liga */}
            <div>
              <label
                htmlFor='abm-league'
                className='text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1'
              >
                Liga / Competición{' '}
                <span className='normal-case text-slate-600'>(opcional)</span>
              </label>
              <input
                id='abm-league'
                type='text'
                value={league}
                onChange={(e) => setLeague(e.target.value)}
                className='w-full bg-base border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-brand focus:outline-none'
              />
            </div>

            {!teamFilled(activeGroup) && (
              <p className='flex items-center gap-1.5 text-[11px] text-slate-500'>
                <AlertCircle className='w-3.5 h-3.5 shrink-0' />
                Cargá los dos equipos para continuar.
              </p>
            )}

            {/* Nav paso 1 */}
            <div className='flex items-center justify-between pt-2 border-t border-white/10'>
              <button
                type='button'
                onClick={onClose}
                className='px-4 py-2 rounded text-xs font-semibold uppercase text-slate-500 hover:text-white'
              >
                Cancelar
              </button>
              <button
                type='button'
                onClick={() => goToStep(2)}
                disabled={!teamFilled(activeGroup)}
                className='flex items-center gap-1.5 px-5 py-2 rounded bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-950/40 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none'
              >
                Siguiente
                <ArrowRight className='w-4 h-4' />
              </button>
            </div>
          </>
        )}

        {/* ================= PASO 2: SELECCIONES ================= */}
        {step === 2 && (
          <>
            {/* Chips de partidos ya cargados */}
            {allowsMultipleMatches && (
              <div className='flex gap-1.5 flex-wrap'>
                {groups.map((g, gi) => {
                  const isActive = gi === activeGroupIdx;
                  const ready = teamFilled(g);
                  const hasSel = groupHasSelections(g);
                  return (
                    <span
                      key={g.key}
                      className={`inline-flex max-w-full items-center gap-1 rounded-full border py-0.5 pl-2 pr-0.5 text-[11px] font-semibold ${
                        isActive
                          ? 'border-brand bg-orange-500/15 text-brand'
                          : 'border-white/10 bg-panel text-slate-400'
                      }`}
                    >
                      <button
                        type='button'
                        onClick={() => {
                          setActiveGroupIdx(gi);
                          // Grupo sin equipos -> completarlo en el paso 1
                          if (!ready) setStep(1);
                        }}
                        className='truncate max-w-[180px]'
                        title={`${g.homeTeam || '?'} vs ${g.awayTeam || '?'}`}
                      >
                        {gi + 1}. {g.homeTeam || 'Sin cargar'} vs{' '}
                        {g.awayTeam || 'Sin cargar'}
                      </button>
                      {hasSel && (
                        <Check className='h-3 w-3 shrink-0 text-emerald-400' />
                      )}
                      {groups.length > 1 && (
                        <button
                          type='button'
                          onClick={() => handleRemoveGroup(gi)}
                          aria-label={`Quitar partido ${gi + 1}`}
                          className='rounded-full p-0.5 hover:bg-white/10 hover:text-red-400'
                        >
                          <Trash2 className='h-3 w-3' />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            <p className='text-xs font-bold text-orange-400 uppercase tracking-wider font-mono'>
              Selecciones — {activeGroup.homeTeam} vs {activeGroup.awayTeam}
            </p>

            {/* Presets */}
            <div className='flex gap-1.5 flex-wrap'>
              <button
                type='button'
                onClick={() =>
                  addPreset('Goles Totales', '+2.5 Goles', 2.5, 'goles')
                }
                className='px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-slate-300'
              >
                +2.5 Goles
              </button>
              <button
                type='button'
                onClick={() =>
                  addPreset('Córners Totales', '+8.5 Córners', 8.5, 'córners')
                }
                className='px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-slate-300'
              >
                +8.5 Córners
              </button>
              <button
                type='button'
                onClick={() =>
                  addPreset('Props de Jugador', 'Jugador 1+ Tiro al arco', 1, 'tiros')
                }
                className='px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-slate-300'
                title='Props de jugador: seguimiento manual con los botones + / -'
              >
                1+ Tiro a puerta (jugador)
              </button>
              <button
                type='button'
                onClick={() =>
                  addPreset('Tiros Totales', '+25.5 Tiros totales', 25.5, 'tiros')
                }
                className='px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-slate-300'
              >
                +25.5 Tiros Totales
              </button>
            </div>

            {/* Condiciones del partido activo */}
            <div className='space-y-2'>
              {activeGroup.conditions.map((c, cIdx) => {
                const apiCategory = detectApiCategory(c.market, c.selection);
                const auto = apiCategory !== null;
                return (
                    <div
                      key={cIdx}
                      className='min-w-0 p-2.5 bg-base rounded border border-white/10 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center'
                    >
                      <input
                        type='text'
                        list='abm-market-options'
                        aria-label={`Mercado condición ${cIdx + 1}`}
                        placeholder='Mercado'
                        value={c.market}
                        onChange={(e) =>
                          handleConditionChange(cIdx, 'market', e.target.value)
                        }
                        className='w-full sm:w-1/3 min-w-0 bg-panel border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:border-brand focus:outline-none'
                      />

                      <div className='sm:w-1/3 w-full min-w-0'>
                      <input
                        type='text'
                        aria-label={`Selección condición ${cIdx + 1}`}
                        placeholder='Selección'
                        value={c.selection}
                        onChange={(e) =>
                          handleConditionChange(cIdx, 'selection', e.target.value)
                        }
                        className='w-full bg-panel border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:border-brand focus:outline-none'
                      />
                      {(c.market.trim() || c.selection.trim()) && (
                        <span
                          title={
                            auto
                              ? `Trackeado automático con datos reales: ${API_MARKET_LABELS[apiCategory]}`
                              : 'Sin coincidencia con la API: actualizala manualmente con los botones + / -'
                          }
                          className={`mt-1 inline-flex max-w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${
                            auto
                              ? 'bg-sky-500/15 text-sky-300'
                              : 'bg-amber-500/10 text-amber-400/90'
                          }`}
                        >
                          {auto
                            ? `⚡ ${API_MARKET_LABELS[apiCategory]}`
                            : '✋ MANUAL'}
                        </span>
                      )}
                    </div>

                      <div className='flex items-center gap-1.5 sm:w-1/3 min-w-0 justify-end'>
                      <div className='flex items-center gap-1 text-xs font-mono'>
                        <input
                          type='number'
                          step='0.5'
                          min='0'
                          aria-label='Valor actual'
                          placeholder='Actual'
                          value={c.currentValue}
                          onChange={(e) =>
                            handleConditionChange(
                              cIdx,
                              'currentValue',
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className='w-14 bg-panel border border-white/10 rounded px-1.5 py-1.5 text-xs text-white text-center font-mono-numbers'
                        />
                        <span>/</span>
                        <input
                          type='number'
                          step='0.5'
                          min='0.5'
                          aria-label='Valor objetivo'
                          placeholder='Meta'
                          value={c.targetValue}
                          onChange={(e) =>
                            handleConditionChange(
                              cIdx,
                              'targetValue',
                              parseFloat(e.target.value) || 1,
                            )
                          }
                          className='w-14 bg-panel border border-white/10 rounded px-1.5 py-1.5 text-xs text-orange-400 text-center font-mono-numbers font-bold'
                        />
                        <input
                          type='number'
                          step='0.01'
                          min='1'
                          aria-label='Cuota de la selección (opcional)'
                          title='Cuota individual — permite recalcular la apuesta si una condición se anula'
                          placeholder='x'
                          value={c.odds ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const value =
                              raw === ''
                                ? undefined
                                : parseFloat(raw) || undefined;
                            mutateConditions(activeGroupIdx, (cs) =>
                              cs.map((cond, i) =>
                                i === cIdx
                                  ? recalcProgress({ ...cond, odds: value })
                                  : cond,
                              ),
                            );
                          }}
                          className='w-12 bg-panel border border-white/10 rounded px-1 py-1.5 text-xs text-slate-300 text-center font-mono-numbers'
                        />
                      </div>

                      <button
                        type='button'
                        role='switch'
                        aria-checked={Boolean(c.superSub)}
                        aria-label='Super Sub: la línea hereda al suplente'
                        title={`${superSubLabel}: si tu jugador es sustituido, la línea hereda al suplente`}
                        onClick={() => toggleSuperSub(cIdx)}
                        className={`px-1.5 py-1 rounded text-[10px] font-semibold border transition-colors ${
                          c.superSub
                            ? 'bg-cyan-400/15 border-cyan-400/50 text-cyan-300'
                            : 'bg-panel border-white/10 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        SS
                      </button>

                      {activeGroup.conditions.length > 1 && (
                        <button
                          type='button'
                          onClick={() => handleRemoveCondition(cIdx)}
                          aria-label={`Eliminar condición ${cIdx + 1}`}
                          className='p-1.5 text-slate-500 hover:text-red-400'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                type='button'
                onClick={handleAddCondition}
                className='flex items-center gap-1 text-xs font-mono font-bold text-brand hover:text-orange-400'
              >
                <Plus className='w-3.5 h-3.5' />
                <span>Añadir condición</span>
              </button>
            </div>

            {/* Agregar otro partido */}
            {allowsMultipleMatches && (
              <button
                type='button'
                onClick={handleAddGroup}
                className='w-full flex items-center justify-center gap-1.5 py-2 rounded border border-dashed border-white/20 text-xs font-mono font-bold text-slate-400 hover:text-brand hover:border-brand/50 transition-colors'
              >
                <Plus className='w-4 h-4' />
                Agregar otro partido
              </button>
            )}

            {/* Nav paso 2 */}
            <div className='flex items-center justify-between pt-2 border-t border-white/10'>
              <button
                type='button'
                onClick={() => goToStep(1)}
                className='flex items-center gap-1 px-4 py-2 rounded text-xs font-semibold uppercase text-slate-400 hover:text-white'
              >
                <ArrowLeft className='w-4 h-4' />
                Atrás
              </button>
              <button
                type='button'
                onClick={() => goToStep(3)}
                disabled={!canGoToStep(3)}
                className='flex items-center gap-1.5 px-5 py-2 rounded bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-950/40 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none'
              >
                Continuar
                <ArrowRight className='w-4 h-4' />
              </button>
            </div>
          </>
        )}

        {/* ================= PASO 3: APUESTA ================= */}
        {step === 3 && (
          <>
            {/* Casa de apuestas */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono'>
                  Casa de Apuestas:{' '}
                  <span className='text-orange-400'>{bookmaker}</span>
                </span>

                <div className='flex items-center bg-panel p-0.5 rounded text-[10px] font-mono border border-white/10'>
                  <button
                    type='button'
                    onClick={() => setBookmakerRegion('AR')}
                    aria-pressed={bookmakerRegion === 'AR'}
                    className={`px-2 py-0.5 rounded transition-all ${
                      bookmakerRegion === 'AR'
                        ? 'bg-brand text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🇦🇷 Argentina
                  </button>
                  <button
                    type='button'
                    onClick={() => setBookmakerRegion('GLOBAL')}
                    aria-pressed={bookmakerRegion === 'GLOBAL'}
                    className={`px-2 py-0.5 rounded transition-all ${
                      bookmakerRegion === 'GLOBAL'
                        ? 'bg-brand text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🌐 Global
                  </button>
                </div>
              </div>

              <div className='flex gap-1.5 flex-wrap'>
                {POPULAR_BOOKMAKERS.filter((b) =>
                  bookmakerRegion === 'AR'
                    ? b.region === 'AR'
                    : b.region === 'GLOBAL' || b.region === 'CRYPTO',
                ).map((b) => (
                  <button
                    key={b.id}
                    type='button'
                    onClick={() => setBookmaker(b.shortName)}
                    aria-pressed={
                      bookmaker.toLowerCase() === b.shortName.toLowerCase()
                    }
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all border ${
                      bookmaker.toLowerCase() === b.shortName.toLowerCase()
                        ? 'bg-orange-500/20 text-brand border-brand font-bold shadow-sm'
                        : 'bg-panel text-slate-300 border-white/5 hover:border-white/20'
                    }`}
                  >
                    {b.badgeLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Stake, cuota y retorno */}
            <div className='space-y-3'>
              <OddsFormatTabs
                variant='full'
                value={inputOddsFormat}
                onChange={handleFormatChange}
              />

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label
                    htmlFor='abm-stake'
                    className='text-[11px] font-semibold text-slate-400 uppercase block mb-1'
                  >
                    Stake ($)
                  </label>
                  <input
                    id='abm-stake'
                    type='number'
                    step='0.5'
                    min='0.5'
                    value={stake}
                    onChange={(e) => setStake(e.target.value)}
                    className='w-full bg-panel border border-white/10 rounded px-2.5 py-1.5 text-sm text-white font-mono-numbers font-bold focus:border-brand focus:outline-none'
                  />
                </div>

                <div>
                  <label
                    htmlFor='abm-odds'
                    className='text-[11px] font-semibold text-slate-400 uppercase block mb-1'
                  >
                    Cuota Total ({inputOddsFormat.toUpperCase()})
                  </label>
                  <input
                    id='abm-odds'
                    type='text'
                    placeholder={getOddsPlaceholder()}
                    value={oddsInput}
                    onChange={(e) => setOddsInput(e.target.value)}
                    aria-invalid={Boolean(oddsError)}
                    className='w-full bg-panel border border-white/10 rounded px-2.5 py-1.5 text-sm text-orange-400 font-mono-numbers font-bold focus:border-brand focus:outline-none'
                  />
                </div>

                <div>
                  <label
                    htmlFor='abm-bookmaker'
                    className='text-[11px] font-semibold text-slate-400 uppercase block mb-1'
                  >
                    Otra Casa (Escribir)
                  </label>
                  <input
                    id='abm-bookmaker'
                    type='text'
                    value={bookmaker}
                    onChange={(e) => setBookmaker(e.target.value)}
                    className='w-full bg-panel border border-white/10 rounded px-2.5 py-1.5 text-sm text-white focus:border-brand focus:outline-none'
                  />
                </div>

                <div>
                  <span className='text-[11px] font-semibold text-slate-400 uppercase block mb-1'>
                    Retorno Máximo
                  </span>
                  <div className='px-2.5 py-1.5 bg-emerald-950/40 border border-emerald-500/30 rounded text-emerald-400 font-mono-numbers font-extrabold text-sm'>
                    ${potentialPayout.toFixed(2)}
                  </div>
                </div>
              </div>

              {oddsError && (
                <p className='text-[11px] text-red-400 flex items-center gap-1.5 -mt-1'>
                  <AlertCircle className='w-3.5 h-3.5 shrink-0' /> {oddsError}
                </p>
              )}

              {/* Equivalencias */}
              <div className='bg-surface p-2 rounded border border-white/5 flex items-center justify-between text-[11px] font-mono flex-wrap gap-2 text-slate-400'>
                <span className='text-slate-500 uppercase text-[10px]'>
                  Equivalencias:
                </span>
                <span>
                  Decimal:{' '}
                  <strong className='text-white font-mono-numbers'>
                    {decimalOdds.toFixed(2)}
                  </strong>
                </span>
                <span>
                  Americana:{' '}
                  <strong className='text-orange-400 font-mono-numbers'>
                    {decimalToAmerican(decimalOdds)}
                  </strong>
                </span>
                <span>
                  Fraccional:{' '}
                  <strong className='text-cyan-400 font-mono-numbers'>
                    {decimalToFractional(decimalOdds)}
                  </strong>
                </span>
                <span>
                  Prob.:{' '}
                  <strong className='text-emerald-400 font-mono-numbers'>
                    {decimalToImpliedProbability(decimalOdds)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Preview del boleto antes de guardar */}
            <div className='rounded border border-white/10 bg-panel/40 p-3'>
              <span className='mb-2 flex items-center gap-1.5 text-xs font-bold text-orange-400 uppercase tracking-wider font-mono'>
                <ClipboardList className='w-3.5 h-3.5' />
                Tu boleto ({totalSelections} selección
                {totalSelections === 1 ? '' : 'es'}
                {filledGroups.length > 1
                  ? ` · ${filledGroups.length} partidos`
                  : ''}
                )
              </span>
              <div className='space-y-2'>
                {filledGroups.map((g) => (
                  <div key={g.key}>
                    <p className='text-[11px] font-bold text-white'>
                      {g.homeTeam} vs {g.awayTeam}
                    </p>
                    <ul className='ml-3 list-disc space-y-0.5'>
                      {g.conditions
                        .filter(
                          (c) =>
                            c.selection.trim() !== '' ||
                            c.market.trim() !== '',
                        )
                        .map((c, i) => (
                          <li
                            key={i}
                            className='text-[11px] leading-snug text-slate-400'
                          >
                            {c.selection.trim() || c.market.trim()}
                            {typeof c.odds === 'number' && c.odds > 0 && (
                              <span className='font-mono-numbers text-slate-500'>
                                {' '}
                                @{c.odds.toFixed(2)}
                              </span>
                            )}
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Nav paso 3 */}
            <div className='flex items-center justify-between pt-2 border-t border-white/10'>
              <button
                type='button'
                onClick={() => goToStep(2)}
                className='flex items-center gap-1 px-4 py-2 rounded text-xs font-semibold uppercase text-slate-400 hover:text-white'
              >
                <ArrowLeft className='w-4 h-4' />
                Atrás
              </button>
              <button
                type='submit'
                disabled={!canSave}
                className='flex items-center gap-1.5 px-5 py-2 rounded bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-950/40 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none'
              >
                <Zap className='w-4 h-4 fill-white' />
                Guardar Apuesta
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};
