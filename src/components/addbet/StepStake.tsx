import React from 'react';
import { AlertCircle, ArrowLeft, ClipboardList, Zap } from 'lucide-react';
import type { ConditionGroup } from './shared';
import type { OddsFormat } from '../../utils/odds';
import {
  decimalToAmerican,
  decimalToFractional,
  decimalToImpliedProbability,
} from '../../utils/odds';
import { OddsFormatTabs } from '../ui/OddsFormatTabs';
import { POPULAR_BOOKMAKERS } from '../../data/bookmakers';

interface StepStakeProps {
  groups: ConditionGroup[];
  totalSelections: number;
  bookmaker: string;
  onBookmakerChange: (value: string) => void;
  bookmakerRegion: 'AR' | 'GLOBAL';
  onBookmakerRegionChange: (region: 'AR' | 'GLOBAL') => void;
  stake: string;
  onStakeChange: (value: string) => void;
  oddsInput: string;
  onOddsInputChange: (value: string) => void;
  inputOddsFormat: OddsFormat;
  onOddsFormatChange: (format: OddsFormat) => void;
  oddsError: string | null;
  decimalOdds: number;
  potentialPayout: number;
  canSave: boolean;
  oddsPlaceholder: string;
  onBack: () => void;
}

export const StepStake: React.FC<StepStakeProps> = ({
  groups,
  totalSelections,
  bookmaker,
  onBookmakerChange,
  bookmakerRegion,
  onBookmakerRegionChange,
  stake,
  onStakeChange,
  oddsInput,
  onOddsInputChange,
  inputOddsFormat,
  onOddsFormatChange,
  oddsError,
  decimalOdds,
  potentialPayout,
  canSave,
  oddsPlaceholder,
  onBack,
}) => {
  return (
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
              onClick={() => onBookmakerRegionChange('AR')}
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
              onClick={() => onBookmakerRegionChange('GLOBAL')}
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
              onClick={() => onBookmakerChange(b.shortName)}
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
          onChange={onOddsFormatChange}
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
              onChange={(e) => onStakeChange(e.target.value)}
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
              placeholder={oddsPlaceholder}
              value={oddsInput}
              onChange={(e) => onOddsInputChange(e.target.value)}
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
              onChange={(e) => onBookmakerChange(e.target.value)}
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
          {groups.length > 1 ? ` · ${groups.length} partidos` : ''})
        </span>
        <div className='space-y-2'>
          {groups.map((g) => (
            <div key={g.key}>
              <p className='text-[11px] font-bold text-white'>
                {g.homeTeam} vs {g.awayTeam}
              </p>
              <ul className='ml-3 list-disc space-y-0.5'>
                {g.conditions
                  .filter(
                    (c) =>
                      c.selection.trim() !== '' || c.market.trim() !== '',
                  )
                  .map((c) => (
                    <li
                      key={c.rowKey}
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
          onClick={onBack}
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
  );
};
