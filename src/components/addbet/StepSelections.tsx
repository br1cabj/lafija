import React from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import type { ConditionField } from './types';
import type { ConditionGroup } from './shared';
import { KNOWN_MARKETS } from '../../data/markets';
import { API_MARKET_LABELS, detectApiCategory } from '../../utils/liveSync';

interface StepSelectionsProps {
  groups: ConditionGroup[];
  activeGroupIdx: number;
  onSelectGroup: (groupIdx: number) => void;
  onRemoveGroup: (groupIdx: number) => void;
  activeGroup: ConditionGroup;
  superSubLabel: string;
  allowsMultipleMatches: boolean;
  onPreset: (
    market: string,
    selection: string,
    targetValue: number,
    unit: string,
  ) => void;
  onAddCondition: () => void;
  onRemoveCondition: (conditionIdx: number) => void;
  onConditionChange: (
    conditionIdx: number,
    field: ConditionField,
    value: string | number,
  ) => void;
  onToggleSuperSub: (conditionIdx: number) => void;
  onConditionOdds: (conditionIdx: number, odds: number | undefined) => void;
  onAddGroup: () => void;
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
}

export const StepSelections: React.FC<StepSelectionsProps> = ({
  groups,
  activeGroupIdx,
  onSelectGroup,
  onRemoveGroup,
  activeGroup,
  superSubLabel,
  allowsMultipleMatches,
  onPreset,
  onAddCondition,
  onRemoveCondition,
  onConditionChange,
  onToggleSuperSub,
  onConditionOdds,
  onAddGroup,
  onBack,
  onContinue,
  canContinue,
}) => {
  return (
    <>
      {/* Autocompletado nativo de mercados canónicos (compartido) */}
      <datalist id='abm-market-options'>
        {KNOWN_MARKETS.map((m) => (
          <option key={m.label} value={m.label} label={m.group} />
        ))}
      </datalist>

      {/* Chips de partidos ya cargados */}
      {allowsMultipleMatches && (
        <div className='flex gap-1.5 flex-wrap'>
          {groups.map((g, gi) => {
            const isActive = gi === activeGroupIdx;
            const hasSel = g.conditions.some(
              (c) => c.selection.trim() !== '' || c.market.trim() !== '',
            );
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
                  onClick={() => onSelectGroup(gi)}
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
                    onClick={() => onRemoveGroup(gi)}
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
            onPreset('Goles Totales', '+2.5 Goles', 2.5, 'goles')
          }
          className='px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-slate-300'
        >
          +2.5 Goles
        </button>
        <button
          type='button'
          onClick={() =>
            onPreset('Córners Totales', '+8.5 Córners', 8.5, 'córners')
          }
          className='px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-slate-300'
        >
          +8.5 Córners
        </button>
        <button
          type='button'
          onClick={() =>
            onPreset(
              'Props de Jugador',
              'Jugador 1+ Tiro al arco',
              1,
              'tiros',
            )
          }
          className='px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-slate-300'
          title='Props de jugador: seguimiento manual con los botones + / -'
        >
          1+ Tiro a puerta (jugador)
        </button>
        <button
          type='button'
          onClick={() =>
            onPreset(
              'Tiros Totales',
              '+25.5 Tiros totales',
              25.5,
              'tiros',
            )
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
              key={c.rowKey}
              className='min-w-0 p-3 bg-base rounded border border-white/10 space-y-2.5'
            >
              {/* Línea 1: mercado y selección, uno al lado del otro */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                <input
                  type='text'
                  list='abm-market-options'
                  aria-label={`Mercado condición ${cIdx + 1}`}
                  placeholder='Mercado'
                  value={c.market}
                  onChange={(e) =>
                    onConditionChange(cIdx, 'market', e.target.value)
                  }
                  className='w-full min-w-0 bg-panel border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:border-brand focus:outline-none'
                />
                <div className='min-w-0'>
                  <input
                    type='text'
                    aria-label={`Selección condición ${cIdx + 1}`}
                    placeholder='Selección'
                    value={c.selection}
                    onChange={(e) =>
                      onConditionChange(cIdx, 'selection', e.target.value)
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
              </div>

              {/* Línea 2: valores etiquetados + acciones */}
              <div className='flex items-end flex-wrap gap-x-2.5 gap-y-2'>
                <label className='flex flex-col gap-0.5'>
                  <span className='text-[9px] font-semibold uppercase tracking-wide text-slate-500'>
                    Actual
                  </span>
                  <input
                    type='number'
                    step='0.5'
                    min='0'
                    aria-label='Valor actual'
                    placeholder='0'
                    value={c.currentValue}
                    onChange={(e) =>
                      onConditionChange(
                        cIdx,
                        'currentValue',
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className='w-16 bg-panel border border-white/10 rounded px-1.5 py-1.5 text-xs text-white text-center font-mono-numbers focus:border-brand focus:outline-none'
                  />
                </label>
                <span
                  className='pb-[7px] text-xs font-mono text-slate-600'
                  aria-hidden
                >
                  /
                </span>
                <label className='flex flex-col gap-0.5'>
                  <span className='text-[9px] font-semibold uppercase tracking-wide text-slate-500'>
                    Meta
                  </span>
                  <input
                    type='number'
                    step='0.5'
                    min='0.5'
                    aria-label='Valor objetivo'
                    placeholder='8.5'
                    value={c.targetValue}
                    onChange={(e) =>
                      onConditionChange(
                        cIdx,
                        'targetValue',
                        parseFloat(e.target.value) || 1,
                      )
                    }
                    className='w-16 bg-panel border border-white/10 rounded px-1.5 py-1.5 text-xs text-orange-400 text-center font-mono-numbers font-bold focus:border-brand focus:outline-none'
                  />
                </label>
                <label className='flex flex-col gap-0.5'>
                  <span className='text-[9px] font-semibold uppercase tracking-wide text-slate-500'>
                    Cuota sel.
                  </span>
                  <input
                    type='number'
                    step='0.01'
                    min='1'
                    aria-label='Cuota de la selección (opcional)'
                    title='Cuota individual — permite recalcular la apuesta si una condición se anula'
                    placeholder='—'
                    value={c.odds ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      onConditionOdds(
                        cIdx,
                        raw === '' ? undefined : parseFloat(raw) || undefined,
                      );
                    }}
                    className='w-16 bg-panel border border-white/10 rounded px-1.5 py-1.5 text-xs text-slate-300 text-center font-mono-numbers focus:border-brand focus:outline-none'
                  />
                </label>

                <div className='ml-auto flex items-center gap-1 pb-0.5'>
                  <button
                    type='button'
                    role='switch'
                    aria-checked={Boolean(c.superSub)}
                    aria-label='Super Sub: la línea hereda al suplente'
                    title={`${superSubLabel}: si tu jugador es sustituido, la línea hereda al suplente`}
                    onClick={() => onToggleSuperSub(cIdx)}
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
                      onClick={() => onRemoveCondition(cIdx)}
                      aria-label={`Eliminar condición ${cIdx + 1}`}
                      className='p-1.5 text-slate-500 hover:text-red-400'
                    >
                      <Trash2 className='w-3.5 h-3.5' />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <button
          type='button'
          onClick={onAddCondition}
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
          onClick={onAddGroup}
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
          onClick={onBack}
          className='flex items-center gap-1 px-4 py-2 rounded text-xs font-semibold uppercase text-slate-400 hover:text-white'
        >
          <ArrowLeft className='w-4 h-4' />
          Atrás
        </button>
        <button
          type='button'
          onClick={onContinue}
          disabled={!canContinue}
          className='flex items-center gap-1.5 px-5 py-2 rounded bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-950/40 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none'
        >
          Continuar
          <ArrowRight className='w-4 h-4' />
        </button>
      </div>
    </>
  );
};
