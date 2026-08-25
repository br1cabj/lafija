import React from 'react';
import {
  Ban,
  CheckCircle2,
  Clock,
  Flame,
  Hand,
  Minus,
  Plus,
  Repeat,
  XCircle,
  Zap,
} from 'lucide-react';
import type { Bet, BetCondition } from '../../types/bet';
import { formatConditionValue } from '../../types/bet';
import { API_MARKET_LABELS, detectApiCategory } from '../../utils/liveSync';

interface ConditionRowProps {
  bet: Pick<Bet, 'id' | 'status'>;
  cond: BetCondition;
  onUpdateDelta: (delta: number) => void;
  onOpenSwap: () => void;
  onOpenSuspend: () => void;
}

/** Fila de condición de la tarjeta: chip de mercado, estado y controles. */
export const ConditionRow: React.FC<ConditionRowProps> = ({
  bet,
  cond,
  onUpdateDelta,
  onOpenSwap,
  onOpenSuspend,
}) => {
  const isMet = cond.status === 'MET';
  const isBusted = cond.status === 'BUSTED';
  const isClutch = cond.status === 'CLUTCH_DANGER';
  const isVoid = cond.status === 'VOID';

  return (
    <li
      title={
        cond.supersubFrom
          ? `Super Sub — heredó de: ${cond.supersubFrom}`
          : cond.dangerNote
      }
      className={`flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm transition-colors ${
        isVoid
          ? 'border-white/5 bg-black/20 opacity-60'
          : isMet
            ? 'border-emerald-500/25 bg-emerald-500/5'
            : isBusted
              ? 'border-red-500/25 bg-red-500/5'
              : isClutch
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-white/10 bg-panel'
      }`}
    >
      <div className='flex min-w-0 items-center gap-2.5'>
        {isVoid ? (
          <Ban className='h-4 w-4 shrink-0 text-slate-500' />
        ) : isMet ? (
          <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-400' />
        ) : isBusted ? (
          <XCircle className='h-4 w-4 shrink-0 text-red-400' />
        ) : isClutch ? (
          <Flame className='h-4 w-4 shrink-0 fill-current text-amber-400' />
        ) : (
          <Clock className='h-4 w-4 shrink-0 text-slate-500' />
        )}
        <div className='min-w-0'>
          {(() => {
            // Chip de mercado: nombre canonico de la API cuando
            // hay match; el texto del usuario en ambar si no.
            const apiCategory = detectApiCategory(cond.market, cond.selection);
            if (apiCategory) {
              return (
                <span
                  title={`Trackeado automáticamente con datos reales: ${API_MARKET_LABELS[apiCategory]}`}
                  className='mb-0.5 inline-flex max-w-full items-center gap-1 truncate rounded-sm border border-white/10 bg-white/5 px-1 py-px text-[9px] font-semibold tracking-wider text-slate-400 uppercase'
                >
                  <Zap className='h-2.5 w-2.5 shrink-0' />
                  {API_MARKET_LABELS[apiCategory]}
                </span>
              );
            }
            if (cond.market) {
              return (
                <span
                  title={`Sin coincidencia con la API: "${cond.market}" — seguimiento manual con + / -`}
                  className='mb-0.5 inline-flex max-w-full items-center gap-1 truncate rounded-sm border border-amber-500/20 bg-amber-500/5 px-1 py-px text-[9px] font-semibold tracking-wider text-amber-400/80 uppercase'
                >
                  <Hand className='h-2.5 w-2.5 shrink-0' />
                  {cond.market}
                </span>
              );
            }
            return null;
          })()}
          <span
            className={`block truncate font-medium ${
              isVoid
                ? 'text-slate-500 line-through'
                : isMet
                  ? 'text-emerald-300'
                  : isBusted
                    ? 'text-red-300 line-through decoration-red-400/50'
                    : isClutch
                      ? 'text-amber-300'
                      : cond.supersubFrom
                        ? 'font-semibold text-cyan-300'
                        : 'text-slate-200'
            }`}
          >
            {cond.selection}
          </span>
          {cond.supersubFrom && (
            <span className='flex items-center gap-1.5 text-[10px]'>
              <span className='truncate text-slate-500 line-through decoration-slate-600'>
                {cond.supersubFrom}
              </span>
              <Repeat className='h-2.5 w-2.5 shrink-0 text-cyan-400' />
              <span
                title={`Super Sub — heredó de: ${cond.supersubFrom}`}
                className='shrink-0 rounded-sm border border-cyan-400/40 bg-cyan-400/10 px-1 font-bold tracking-wide text-cyan-300'
              >
                SUPER SUB
              </span>
            </span>
          )}
        </div>
        {cond.superSub && !isVoid && !cond.supersubFrom && (
          <span
            title='Super Sub: la línea hereda al suplente'
            className='shrink-0 rounded-sm border border-cyan-400/40 bg-cyan-400/10 px-1 py-0.5 text-[9px] font-bold text-cyan-300'
          >
            SS
          </span>
        )}
      </div>

      {/* Valor actual y controles +/- */}
      <div className='font-mono-numbers flex shrink-0 items-center gap-2'>
        {!isVoid && (
          <span
            className={`text-sm font-bold ${isMet ? 'text-emerald-400' : isBusted ? 'text-red-400' : isClutch ? 'text-amber-400' : 'text-brand'}`}
          >
            {formatConditionValue(cond)}
          </span>
        )}
        {isVoid && (
          <button
            type='button'
            onClick={onOpenSuspend}
            title='Ajustar cuotas del boleto con los valores reales de tu casa'
            className='text-[10px] font-semibold tracking-wide text-slate-500 uppercase underline decoration-dotted underline-offset-2 hover:text-slate-300'
          >
            Cuota 1.0
          </button>
        )}

        {/* Super Sub: cambiar jugador durante el partido */}
        {cond.superSub &&
          bet.status === 'LIVE' &&
          !isVoid &&
          !isMet &&
          !isBusted && (
            <button
              onClick={onOpenSwap}
              aria-label={`Super Sub: cambiar jugador en ${cond.selection}`}
              title='Super Sub: el suplente que entró hereda esta línea'
              className='flex h-7 w-7 items-center justify-center rounded-sm border border-white/10 text-slate-400 transition-colors duration-150 hover:border-brand/50 hover:text-brand'
            >
              <Repeat className='h-3.5 w-3.5' />
            </button>
          )}

        {typeof cond.currentValue === 'number' &&
          bet.status === 'LIVE' &&
          !isVoid &&
          !isMet &&
          !isBusted && (
            <div className='flex items-center gap-1 rounded-md border border-white/10 bg-black/40 p-0.5'>
              <button
                onClick={() => onUpdateDelta(-1)}
                aria-label={`Restar 1 a ${cond.selection}`}
                className='flex h-7 w-7 items-center justify-center rounded-sm text-slate-300 transition-colors duration-150 hover:bg-white/10 hover:text-white'
              >
                <Minus className='h-3.5 w-3.5' />
              </button>
              <button
                onClick={() => onUpdateDelta(1)}
                aria-label={`Sumar 1 a ${cond.selection}`}
                className='flex h-7 w-7 items-center justify-center rounded-sm bg-brand text-white transition-colors duration-150 hover:bg-brand-hover'
              >
                <Plus className='h-3.5 w-3.5' />
              </button>
            </div>
          )}
      </div>
    </li>
  );
};
