import React, { useState } from 'react';
import { useBets } from '../context/BetContext';
import type {
  BetCondition,
  BetType,
  ConditionStatus,
  SportType,
} from '../types/bet';
import { POPULAR_BOOKMAKERS } from '../data/bookmakers';
import { SPORT_OPTIONS } from '../data/sports';
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
import {
  Plus,
  Trash2,
  Zap,
  Sparkles,
  Radio,
  Calendar,
  AlertCircle,
} from 'lucide-react';

type ConditionField = keyof Pick<
  BetCondition,
  'market' | 'selection' | 'currentValue' | 'targetValue'
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
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [betType, setBetType] = useState<BetType>('bet_builder');
  const [stake, setStake] = useState('');
  const [inputOddsFormat, setInputOddsFormat] = useState<OddsFormat>(
    globalOddsFormat || 'decimal',
  );
  const [oddsInput, setOddsInput] = useState('');
  const [bookmaker, setBookmaker] = useState('');
  const [bookmakerRegion, setBookmakerRegion] = useState<'AR' | 'GLOBAL'>('AR');

  // Conditions list - arranca con una fila vacía
  const [conditions, setConditions] = useState<Omit<BetCondition, 'id'>[]>([
    { ...EMPTY_CONDITION },
  ]);

  // Nota: el form se monta fresco en cada apertura (App renderiza
  // condicionalmente el modal), por lo que no hace falta resetear estado.

  const handleAddCondition = () => {
    setConditions([...conditions, { ...EMPTY_CONDITION }]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

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

  const handleConditionChange = (
    index: number,
    field: ConditionField,
    value: string | number,
  ) => {
    setConditions((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        return recalcProgress({ ...c, [field]: value });
      }),
    );
  };

  const handleFormatChange = (newFormat: OddsFormat) => {
    if (newFormat === inputOddsFormat) return;
    const converted = convertOddsInput(oddsInput, inputOddsFormat, newFormat);
    setInputOddsFormat(newFormat);
    if (converted) {
      setOddsInput(converted);
    }
  };

  const addPreset = (
    market: string,
    selection: string,
    targetValue: number,
    unit: string,
  ) => {
    setConditions([
      ...conditions,
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
  };

  const parsedStake = parseFloat(stake.replace(',', '.')) || 0;
  const parsedOdds = parseInputToDecimal(oddsInput, inputOddsFormat);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedOdds === null || parsedStake <= 0) return;

    const isLive = matchStatus === 'LIVE';

    // Descartar filas que el usuario dejó completamente vacías
    const filledConditions = conditions.filter(
      (c) => c.selection.trim() !== '' || c.market.trim() !== '',
    );
    if (filledConditions.length === 0) return;

    const mappedConditions: BetCondition[] = filledConditions.map((c, i) => ({
      ...c,
      market: c.market.trim() || 'General',
      selection: c.selection.trim(),
      id: `cond-${Date.now()}-${i}`,
      status: c.status === 'MET' ? 'MET' : isLive ? 'IN_PROGRESS' : 'PENDING',
    }));

    addBet({
      title: `${homeTeam || 'Equipo 1'} vs ${awayTeam || 'Equipo 2'} // ${betType.toUpperCase()}`,
      sport,
      league: league || 'Liga Principal',
      type: betType,
      match: {
        homeTeam: homeTeam || 'Equipo Local',
        awayTeam: awayTeam || 'Equipo Visitante',
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel='Registrar nueva apuesta'
      maxWidthClass='max-w-2xl'
    >
      {/* Header */}
      <div className='flex items-center gap-2.5 border-b border-white/10 pb-4 mb-4'>
        <div className='p-2 rounded bg-orange-500/20 text-brand'>
          <Zap className='w-5 h-5' />
        </div>
        <div>
          <h2 className='text-lg font-bold text-white uppercase tracking-wider font-mono'>
            Registrar Nueva Apuesta
          </h2>
          <p className='text-xs text-slate-400'>
            Mercados, cuotas y condiciones del tracker
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Match Status Selector (En Vivo vs Pre-Partido) */}
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
            <span>En Vivo (Comenzó)</span>
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
            <span>Pre-Partido (Programado)</span>
          </button>
        </div>

        {/* Match & Sport info */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
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
              <option value='bet_builder'>
                🔥 Bet Builder (Mismo partido)
              </option>
              <option value='parlay'>⚡ Parlay / Combinada</option>
              <option value='single'>Simple (1 selección)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor='abm-league'
              className='text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1'
            >
              Liga / Competición
            </label>
            <input
              id='abm-league'
              type='text'
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              className='w-full bg-base border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-brand focus:outline-none'
            />
          </div>
        </div>

        {/* Teams / Event */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <div>
            <label
              htmlFor='abm-home'
              className='text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1'
            >
              Equipo Local / Jugador 1
            </label>
            <input
              id='abm-home'
              type='text'
              required
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              className='w-full bg-base border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-brand focus:outline-none'
            />
          </div>

          <div>
            <label
              htmlFor='abm-away'
              className='text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1'
            >
              Equipo Visitante / Jugador 2
            </label>
            <input
              id='abm-away'
              type='text'
              required
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              className='w-full bg-base border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-brand focus:outline-none'
            />
          </div>
        </div>

        {/* Odds Format Selector Tabs & Form Row */}
        <div className='bg-base p-3.5 rounded border border-white/10 space-y-3'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/5 pb-2'>
            <span className='text-xs font-bold text-orange-400 uppercase tracking-wider font-mono'>
              Formato de Cuota:
            </span>
            <OddsFormatTabs
              variant='full'
              value={inputOddsFormat}
              onChange={handleFormatChange}
            />
          </div>

          {/* Bookmaker Selector (Argentina & Global) */}
          <div className='pt-2 border-t border-white/5 space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1'>
                <span>Casa de Apuestas:</span>
                <span className='text-orange-400 font-bold'>{bookmaker}</span>
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
                  🌐 Global / Crypto
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

          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
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
                required
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
                Cuota ({inputOddsFormat.toUpperCase()})
              </label>
              <input
                id='abm-odds'
                type='text'
                required
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
                required
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

          {/* Real-time Multi-Format Odds Live Conversion Bar */}
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
              Probabilidad:{' '}
              <strong className='text-emerald-400 font-mono-numbers'>
                {decimalToImpliedProbability(decimalOdds)}
              </strong>
            </span>
          </div>
        </div>

        {/* Quick Presets for Conditions */}
        <div>
          <div className='flex items-center justify-between mb-1.5'>
            <span className='text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1'>
              <Sparkles className='w-3.5 h-3.5 text-orange-400' />
              Presets Rápidos
            </span>
          </div>
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
                addPreset(
                  'Tarjetas Totales',
                  '+3.5 Tarjetas',
                  3.5,
                  'tarjetas',
                )
              }
              className='px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-slate-300'
            >
              +3.5 Tarjetas
            </button>
            <button
              type='button'
              onClick={() =>
                addPreset(
                  'Tiros a Puerta',
                  'Jugador 1+ Tiro al arco',
                  1,
                  'tiros',
                )
              }
              className='px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-slate-300'
            >
              1+ Tiro a puerta
            </button>
          </div>
        </div>

        {/* Conditions List */}
        <div className='space-y-2.5'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-bold text-orange-400 uppercase tracking-wider font-mono'>
              Condiciones del Tracker ({conditions.length})
            </span>
            <button
              type='button'
              onClick={handleAddCondition}
              className='flex items-center gap-1 text-xs font-mono font-bold text-brand hover:text-orange-400'
            >
              <Plus className='w-3.5 h-3.5' />
              <span>Añadir Condición</span>
            </button>
          </div>

          {conditions.map((c, idx) => (
            <div
              key={idx}
              className='p-3 bg-base rounded border border-white/10 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center'
            >
              <input
                type='text'
                aria-label={`Mercado condición ${idx + 1}`}
                placeholder='Mercado'
                value={c.market}
                onChange={(e) =>
                  handleConditionChange(idx, 'market', e.target.value)
                }
                className='bg-panel border border-white/10 rounded px-2.5 py-1.5 text-xs text-white sm:w-1/3 focus:border-brand focus:outline-none'
              />

              <input
                type='text'
                aria-label={`Selección condición ${idx + 1}`}
                placeholder='Selección'
                value={c.selection}
                onChange={(e) =>
                  handleConditionChange(idx, 'selection', e.target.value)
                }
                className='bg-panel border border-white/10 rounded px-2.5 py-1.5 text-xs text-white sm:w-1/3 focus:border-brand focus:outline-none'
              />

              <div className='flex items-center gap-1.5 sm:w-1/3 justify-end'>
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
                        idx,
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
                        idx,
                        'targetValue',
                        parseFloat(e.target.value) || 1,
                      )
                    }
                    className='w-14 bg-panel border border-white/10 rounded px-1.5 py-1.5 text-xs text-orange-400 text-center font-mono-numbers font-bold'
                  />
                </div>

                {conditions.length > 1 && (
                  <button
                    type='button'
                    onClick={() => handleRemoveCondition(idx)}
                    aria-label={`Eliminar condición ${idx + 1}`}
                    className='p-1.5 text-slate-500 hover:text-red-400'
                  >
                    <Trash2 className='w-3.5 h-3.5' />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Buttons */}
        <div className='flex items-center justify-end gap-3 pt-4 border-t border-white/10'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 rounded text-xs font-semibold uppercase text-slate-400 hover:text-white'
          >
            Cancelar
          </button>
          <button
            type='submit'
            disabled={parsedOdds === null || parsedStake <= 0}
            className='px-5 py-2 rounded bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-950/40 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none'
          >
            <Zap className='w-4 h-4 fill-white' />
            <span>Guardar Apuesta</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
