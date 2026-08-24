import React from 'react';
import { useBets } from '../context/BetContext';

export const StatsOverview: React.FC = () => {
  const { stats, currencySymbol } = useBets();

  return (
    <div className='my-4 flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-surface px-5 py-4'>
      {/* Bankroll */}
      <div className='flex-1'>
        <span className='mb-0.5 block text-[11px] font-medium tracking-wide text-slate-400 uppercase'>
          Bankroll
        </span>
        <span className='font-mono-numbers text-xl font-bold text-white sm:text-2xl'>
          {currencySymbol}
          {stats.bankroll.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>

      <div className='h-10 w-px bg-white/10' />

      {/* Ganancia */}
      <div className='flex-1 text-center'>
        <span className='mb-0.5 block text-[11px] font-medium tracking-wide text-slate-400 uppercase'>
          Ganancia · ROI {stats.roi >= 0 ? `+${stats.roi}%` : `${stats.roi}%`}
        </span>
        <span
          className={`font-mono-numbers text-xl font-bold sm:text-2xl ${
            stats.netProfit >= 0 ? 'text-won' : 'text-lost'
          }`}
        >
          {stats.netProfit >= 0 ? '+' : '-'}
          {currencySymbol}
          {Math.abs(stats.netProfit).toFixed(2)}
        </span>
      </div>

      <div className='h-10 w-px bg-white/10' />

      {/* En vivo */}
      <div className='flex-1 text-right'>
        <span className='mb-0.5 block text-[11px] font-medium tracking-wide text-slate-400 uppercase'>
          En vivo
        </span>
        <div className='flex items-center justify-end gap-2'>
          {stats.liveBets > 0 && (
            <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-red-500' />
          )}
          <span className='font-mono-numbers text-xl font-bold text-white sm:text-2xl'>
            {stats.liveBets}
          </span>
          <span className='text-xs text-slate-400'>activas</span>
        </div>
      </div>
    </div>
  );
};
