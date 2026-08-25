import React, { useState } from 'react';
import { useBets } from '../context/BetContext';
import type {
  BetCondition,
  BetType,
  ConditionMatch,
  ExtraMatchInfo,
  SportType,
} from '../types/bet';
import { getSuperSubLabel } from '../data/bookmakers';
import type { OddsFormat } from '../utils/odds';
import { convertOddsInput, parseInputToDecimal } from '../utils/odds';
import { Modal } from './ui/Modal';
import { Zap } from 'lucide-react';
import { Check } from 'lucide-react';
import {
  newDraft,
  newGroup,
  type ConditionDraft,
  type ConditionGroup,
} from './addbet/shared';
import type { ConditionField } from './addbet/types';
import { StepMatch } from './addbet/StepMatch';
import { StepSelections } from './addbet/StepSelections';
import { StepStake } from './addbet/StepStake';

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

  /** Grupo con al menos una selección con texto. */
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

  /** Chip de partido: activarlo; si no tiene equipos, mandar al paso 1. */
  const handleSelectGroup = (gIdx: number) => {
    setActiveGroupIdx(gIdx);
    if (!teamFilled(groups[gIdx])) setStep(1);
  };

  const handleTeamChange = (
    side: 'home' | 'away',
    name: string,
    teamId?: number,
  ) =>
    setGroups((prev) =>
      prev.map((g, i) =>
        i === activeGroupIdx
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

  const recalcProgress = (cond: ConditionDraft): ConditionDraft => {
    const cur = Number(cond.currentValue) || 0;
    const tar = Number(cond.targetValue) || 1;
    const isMet = cur >= tar;
    const status = isMet
      ? ('MET' as const)
      : matchStatus === 'PENDING'
        ? ('PENDING' as const)
        : ('IN_PROGRESS' as const);
    return {
      ...cond,
      progress: Math.min(100, Math.round((cur / tar) * 100)),
      status,
      isLock: isMet,
    };
  };

  const mutateConditions = (
    fn: (conds: ConditionDraft[]) => ConditionDraft[],
  ) =>
    setGroups((prev) =>
      prev.map((g, i) =>
        i === activeGroupIdx ? { ...g, conditions: fn(g.conditions) } : g,
      ),
    );

  const handleConditionChange = (
    cIdx: number,
    field: ConditionField,
    value: string | number,
  ) =>
    mutateConditions((cs) =>
      cs.map((c, i) =>
        i === cIdx ? recalcProgress({ ...c, [field]: value }) : c,
      ),
    );

  const handleConditionOdds = (cIdx: number, odds: number | undefined) =>
    mutateConditions((cs) =>
      cs.map((c, i) => (i === cIdx ? recalcProgress({ ...c, odds }) : c)),
    );

  const addPreset = (
    market: string,
    selection: string,
    targetValue: number,
    unit: string,
  ) =>
    mutateConditions((cs) => [
      ...cs,
      {
        ...newDraft(),
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
    if (target === 2) return teamFilled(groups[activeGroupIdx]);
    if (target === 3) {
      return (
        teamFilled(activeGroup) &&
        groups.some((g) => teamFilled(g) && groupHasSelections(g))
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
      // rowKey es solo para React: se descarta al guardar
      return g.conditions
        .filter((c) => c.selection.trim() !== '' || c.market.trim() !== '')
        .map(({ rowKey: _rowKey, ...c }: ConditionDraft) => ({
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
    const extraMatches: ExtraMatchInfo[] | undefined = multiMatch
      ? filledGroups.slice(1).map((g) => ({
          key: `${(g.homeTeam || 'equipo').toLowerCase()}|${(g.awayTeam || 'equipo').toLowerCase()}`,
          homeTeam: g.homeTeam || 'Equipo Local',
          awayTeam: g.awayTeam || 'Equipo Visitante',
          homeTeamId: g.homeTeamId,
          awayTeamId: g.awayTeamId,
          ...(isLive ? { homeScore: 0, awayScore: 0, minute: "01'" } : {}),
          status: (isLive ? 'LIVE' : 'SCHEDULED') as ExtraMatchInfo['status'],
        }))
      : undefined;
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
      extraMatches,
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

  const getOddsPlaceholder = (): string => {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel='Registrar nueva apuesta'
      maxWidthClass='max-w-xl'
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
                          : 'text-slate-400'
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
      {/* Transición suave entre pasos */}
      <div key={step} className='animate-step-in space-y-4'>
        {/* ================= PASO 1: PARTIDO ================= */}
        {step === 1 && (
          <StepMatch
            matchStatus={matchStatus}
            onMatchStatusChange={setMatchStatus}
            sport={sport}
            onSportChange={setSport}
            betType={betType}
            onBetTypeChange={setBetType}
            league={league}
            onLeagueChange={setLeague}
            activeGroupIdx={activeGroupIdx}
            totalGroups={groups.length}
            allowsMultipleMatches={allowsMultipleMatches}
            homeTeam={activeGroup.homeTeam}
            awayTeam={activeGroup.awayTeam}
            groupKey={activeGroup.key}
            onTeamChange={handleTeamChange}
            canContinue={teamFilled(activeGroup)}
            onNext={() => goToStep(2)}
            onCancel={onClose}
          />
        )}

        {/* ================= PASO 2: SELECCIONES ================= */}
        {step === 2 && (
          <StepSelections
            groups={groups}
            activeGroupIdx={activeGroupIdx}
            onSelectGroup={handleSelectGroup}
            onRemoveGroup={handleRemoveGroup}
            activeGroup={activeGroup}
            superSubLabel={superSubLabel}
            allowsMultipleMatches={allowsMultipleMatches}
            onPreset={addPreset}
            onAddCondition={() =>
              mutateConditions((cs) => [...cs, newDraft()])
            }
            onRemoveCondition={(cIdx) =>
              mutateConditions((cs) => cs.filter((_, i) => i !== cIdx))
            }
            onConditionChange={handleConditionChange}
            onToggleSuperSub={(cIdx) =>
              mutateConditions((cs) =>
                cs.map((c, i) =>
                  i === cIdx ? { ...c, superSub: !c.superSub } : c,
                ),
              )
            }
            onConditionOdds={handleConditionOdds}
            onAddGroup={handleAddGroup}
            onBack={() => goToStep(1)}
            onContinue={() => goToStep(3)}
            canContinue={canGoToStep(3)}
          />
        )}

        {/* ================= PASO 3: APUESTA ================= */}
        {step === 3 && (
          <StepStake
            groups={filledGroups}
            totalSelections={totalSelections}
            bookmaker={bookmaker}
            onBookmakerChange={setBookmaker}
            bookmakerRegion={bookmakerRegion}
            onBookmakerRegionChange={setBookmakerRegion}
            stake={stake}
            onStakeChange={setStake}
            oddsInput={oddsInput}
            onOddsInputChange={setOddsInput}
            inputOddsFormat={inputOddsFormat}
            onOddsFormatChange={handleFormatChange}
            oddsError={oddsError}
            decimalOdds={decimalOdds}
            potentialPayout={potentialPayout}
            canSave={canSave}
            oddsPlaceholder={getOddsPlaceholder()}
            onBack={() => goToStep(2)}
          />
        )}
      </div>
      </form>
    </Modal>
  );
};
