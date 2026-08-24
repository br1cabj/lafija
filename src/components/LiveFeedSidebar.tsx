import React, { useMemo } from 'react';
import { useBets } from '../context/BetContext';
import { formatConditionValue } from '../types/bet';
import { Zap, Target, Bell, Flame, Shield } from 'lucide-react';
import { ADS_ENABLED } from '../config/ads';
import { AdCard } from './ads/AdCard';

export const LiveFeedSidebar: React.FC = () => {
  const { liveLogs, isSimulating, bets } = useBets();

  const { liveBets, pendingConditions } = useMemo(() => {
    const liveBets = bets.filter((b) => b.status === 'LIVE');
    const pendingConditions = liveBets.flatMap((b) =>
      b.conditions.filter((c) => c.status !== 'MET'),
    );
    return { liveBets, pendingConditions };
  }, [bets]);

  return (
    <div className='space-y-4'>
      {/* Stream de eventos en vivo */}
      <div className='panel-card rounded-lg p-4'>
        <div className='mb-3 flex items-center justify-between border-b border-white/10 pb-3'>
          <div className='flex items-center gap-2'>
            {isSimulating ? (
              <span className='relative flex h-2 w-2'>
                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75' />
                <span className='relative inline-flex h-2 w-2 rounded-full bg-red-500' />
              </span>
            ) : (
              <span className='h-2 w-2 rounded-full bg-slate-600' />
            )}
            <h3 className='text-xs font-semibold tracking-wider text-white uppercase'>
              Eventos en vivo
            </h3>
          </div>
          <span className='font-mono-numbers text-[10px] tracking-wide text-slate-400 uppercase'>
            {isSimulating ? 'Transmitiendo' : 'En espera'}
          </span>
        </div>

        {/* Lista de eventos */}
        <div className='max-h-96 space-y-2 overflow-y-auto pr-1'>
          {liveLogs.length === 0 ? (
            <p className='py-6 text-center text-xs text-slate-500'>
              Sin eventos. Activa el simulador o el modo de datos reales.
            </p>
          ) : (
            liveLogs.map((log) => {
              const isHit = log.type === 'CUMPLIDO';
              const isClutch = log.type === 'CLUTCH';

              return (
                <div
                  key={log.id}
                  className={`rounded-md border p-2.5 text-xs transition-colors ${
                    isHit
                      ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-300'
                      : isClutch
                        ? 'border-amber-500/30 bg-amber-500/5 text-amber-300'
                        : 'border-white/5 text-slate-300'
                  }`}
                >
                  <div className='font-mono-numbers mb-1 flex items-center justify-between text-[10px]'>
                    <span className='truncate font-semibold text-orange-400'>
                      {log.matchTitle}
                    </span>
                    <span className='ml-2 shrink-0 text-slate-500'>
                      {log.time}
                    </span>
                  </div>
                  <p className='flex items-start gap-1.5 leading-snug'>
                    {isHit ? (
                      <Target className='mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400' />
                    ) : isClutch ? (
                      <Flame className='mt-0.5 h-3.5 w-3.5 shrink-0 fill-current text-amber-400' />
                    ) : (
                      <Zap className='mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400' />
                    )}
                    <span>{log.text}</span>
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Condiciones pendientes */}
      {liveBets.length > 0 && (
        <div className='panel-card rounded-lg p-4'>
          <div className='mb-3 flex items-center justify-between border-b border-white/10 pb-2.5'>
            <h4 className='flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-300 uppercase'>
              <Bell className='h-3.5 w-3.5 text-brand' />
              Condiciones pendientes
            </h4>
            <span className='font-mono-numbers text-[10px] font-bold text-orange-400'>
              {pendingConditions.length}
            </span>
          </div>

          <div className='space-y-2'>
            {pendingConditions.map((cond) => (
              <div
                key={cond.id}
                className='rounded-md border border-white/5 p-2 text-xs'
              >
                <div className='flex items-center justify-between gap-2 font-medium text-slate-300'>
                  <span className='truncate'>{cond.selection}</span>
                  <span className='font-mono-numbers shrink-0 text-[11px] font-bold text-orange-400'>
                    {formatConditionValue(cond)}
                  </span>
                </div>
                <div className='mt-1.5 h-1 overflow-hidden rounded-full bg-black/40'>
                  <div
                    className='h-full rounded-full bg-brand transition-all duration-300'
                    style={{ width: `${cond.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consejo de bankroll */}
      <div className='rounded-lg border border-orange-500/20 bg-surface p-4'>
        <div className='mb-1 flex items-center gap-2 text-xs font-semibold tracking-wide text-orange-400 uppercase'>
          <Shield className='h-3.5 w-3.5' />
          <span>Protección de bankroll</span>
        </div>
        <p className='text-xs leading-relaxed text-slate-400'>
          No arriesgues más del <strong className='text-slate-200'>3% al 5%</strong>{' '}
          de tu bankroll por apuesta simple para mantener un crecimiento
          sostenido.
        </p>
      </div>

      {/* Publicidad (afiliado) — invisible hasta activar ADS_ENABLED */}
      {ADS_ENABLED && <AdCard variant='compact' />}
    </div>
  );
};
