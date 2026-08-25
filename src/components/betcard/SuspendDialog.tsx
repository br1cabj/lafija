import React, { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { Bet } from '../../types/bet';
import { effectiveOdds, estimateLegOdds, hasEstimatedLegs } from '../../types/bet';
import { formatOdds } from '../../utils/odds';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useBets } from '../../context/BetContext';

interface SuspendDialogProps {
  isOpen: boolean;
  bet: Bet;
  onClose: () => void;
  onVoidConditions: (ids: string[]) => void;
  onVoidBet: () => void;
  setConditionOdds: (betId: string, conditionId: string, odds?: number) => void;
}

/** Diálogo de anulación por suspensión: por condición (cuota 1.0) o total,
 * con carga opcional de cuotas reales y preview de la liquidación. */
export const SuspendDialog: React.FC<SuspendDialogProps> = ({
  isOpen,
  bet,
  onClose,
  onVoidConditions,
  onVoidBet,
  setConditionOdds,
}) => {
  const { oddsFormat, currencySymbol } = useBets();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [oddsDraft, setOddsDraft] = useState<Record<string, number>>({});
  const voidable = bet.conditions.filter((c) => c.status !== 'VOID');

  // Preview de liquidación aplicando los borradores de cuota + anulaciones
  const preview = useMemo(() => {
    if (selected.size === 0) return null;
    const sim: Bet = {
      ...bet,
      conditions: bet.conditions.map((c) => {
        const draft = oddsDraft[c.id];
        const withDraft = draft ? { ...c, odds: draft } : c;
        return selected.has(c.id)
          ? { ...withDraft, status: 'VOID' as const }
          : withDraft;
      }),
    };
    return {
      odds: effectiveOdds(sim),
      estimated: hasEstimatedLegs(sim),
    };
  }, [bet, oddsDraft, selected]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const close = () => {
    setSelected(new Set());
    setOddsDraft({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      ariaLabel='Suspensión del partido'
      maxWidthClass='max-w-md'
    >
      <h2 className='mb-1 text-sm font-semibold text-white'>
        Suspensión del partido
      </h2>
      <p className='mb-4 text-xs text-slate-400'>
        Si el partido no se reanuda en 24-48hs (según tu casa), las selecciones
        afectadas se anulan: aportan cuota 1.0 y el resto del ticket sigue
        válido.
      </p>

      <div className='mb-4 space-y-1.5'>
        {voidable.map((cond) => (
          <button
            key={cond.id}
            type='button'
            role='checkbox'
            aria-checked={selected.has(cond.id)}
            onClick={() => toggle(cond.id)}
            className={`flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
              selected.has(cond.id)
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                : 'border-white/10 bg-panel text-slate-300 hover:border-white/25'
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                selected.has(cond.id)
                  ? 'border-amber-400 bg-amber-400 text-black'
                  : 'border-white/25'
              }`}
            >
              {selected.has(cond.id) && <CheckCircle2 className='h-3 w-3' />}
            </span>
            <span className='truncate'>{cond.selection}</span>
            {typeof cond.odds === 'number' && cond.odds > 0 && (
              <span className='ml-auto shrink-0 font-mono-numbers text-[10px] text-slate-500'>
                @{cond.odds.toFixed(2)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cuotas reales por pata: para que la liquidación coincida con la casa */}
      <details className='mb-3 rounded-md border border-white/10 bg-panel'>
        <summary className='cursor-pointer px-3 py-2 text-xs font-medium text-slate-400 select-none hover:text-slate-200'>
          Cargar cuotas reales del ticket{' '}
          <span className='text-slate-600'>(opcional — mejora el cálculo)</span>
        </summary>
        <div className='space-y-1.5 px-3 pb-3 pt-1'>
          {bet.conditions.map((cond) => {
            const est = estimateLegOdds(bet).toFixed(2);
            return (
              <label
                key={cond.id}
                className='flex items-center justify-between gap-2 text-xs'
              >
                <span className='truncate text-slate-400'>
                  {cond.selection}
                </span>
                <input
                  type='number'
                  step='0.01'
                  min='1'
                  inputMode='decimal'
                  placeholder={est}
                  defaultValue={
                    typeof cond.odds === 'number' && cond.odds > 0
                      ? cond.odds
                      : ''
                  }
                  onChange={(e) =>
                    setOddsDraft((prev) => {
                      const next = { ...prev };
                      const raw = e.target.value.trim();
                      if (raw === '') delete next[cond.id];
                      else {
                        const v = parseFloat(raw.replace(',', '.'));
                        if (Number.isFinite(v) && v >= 1) next[cond.id] = v;
                      }
                      return next;
                    })
                  }
                  aria-label={`Cuota individual de ${cond.selection}`}
                  className='w-20 shrink-0 rounded border border-white/10 bg-base px-2 py-1 text-right font-mono-numbers text-xs text-white focus:border-brand focus:outline-none'
                />
              </label>
            );
          })}
          <p className='pt-1 text-[10px] leading-relaxed text-slate-600'>
            Vacío = estimación automática ({estimateLegOdds(bet).toFixed(2)} por
            pata). Con las cuotas reales de tu ticket, la liquidación coincide
            con tu casa.
          </p>
        </div>
      </details>

      {/* Preview en vivo de la liquidación con la selección actual */}
      {selected.size > 0 && preview && (
        <div className='mb-4 flex items-center justify-between gap-2 rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs'>
          <div>
            <span className='block text-[10px] tracking-wide text-slate-500 uppercase'>
              Nueva cuota efectiva
            </span>
            <span className='font-mono-numbers font-bold text-orange-400'>
              {formatOdds(preview.odds, oddsFormat)}
              {preview.estimated && (
                <span className='ml-1 text-[9px] font-normal text-slate-500'>
                  (est.)
                </span>
              )}
            </span>
          </div>
          <div className='text-right'>
            <span className='block text-[10px] tracking-wide text-slate-500 uppercase'>
              Retorno si ganás
            </span>
            <span className='font-mono-numbers font-bold text-emerald-400'>
              {currencySymbol}
              {(preview.odds * bet.stake).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      <div className='flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end'>
        <Button variant='ghost' onClick={close}>
          Esperar reanudación
        </Button>
        <Button
          variant='secondary'
          disabled={selected.size === 0}
          onClick={() => {
            // Guarda las cuotas reales cargadas antes de anular
            for (const [condId, odds] of Object.entries(oddsDraft)) {
              setConditionOdds(bet.id, condId, odds);
            }
            onVoidConditions([...selected]);
            close();
          }}
        >
          Anular selección ({selected.size})
        </Button>
        <Button
          variant='danger'
          onClick={() => {
            onVoidBet();
            close();
          }}
        >
          Anular toda la apuesta
        </Button>
      </div>
    </Modal>
  );
};
