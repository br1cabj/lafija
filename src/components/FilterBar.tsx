import React, { useMemo } from 'react';
import { useBets } from '../context/BetContext';
import { Search, X } from 'lucide-react';
import clsx from 'clsx';

export const FilterBar: React.FC = () => {
  const {
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    bets,
    counts,
    currencySymbol,
  } = useBets();

  // Single pass over the filtered subsets instead of repeated bets.filter calls
  const { wonProfit, liveStake, livePayout } = useMemo(() => {
    let wonProfit = 0;
    let liveStake = 0;
    let livePayout = 0;
    for (const b of bets) {
      if (b.status === 'WON') wonProfit += b.potentialPayout - b.stake;
      else if (b.status === 'LIVE') {
        liveStake += b.stake;
        livePayout += b.potentialPayout;
      }
    }
    return {
      wonProfit: wonProfit.toFixed(2),
      liveStake: liveStake.toFixed(2),
      livePayout: livePayout.toFixed(2),
    };
  }, [bets]);

  const filterTabs = [
    { id: 'ALL', label: 'Todas', count: counts.all, isLive: false },
    { id: 'LIVE', label: 'En vivo', count: counts.live, isLive: true },
    {
      id: 'PENDING',
      label: 'Pendientes',
      count: counts.pending,
      isLive: false,
    },
    { id: 'WON', label: 'Ganadas', count: counts.won, isLive: false },
  ];

  return (
    <div className='mb-4 space-y-2.5'>
      {/* Buscador */}
      <div className='relative w-full'>
        <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500' />
        <input
          type='search'
          aria-label='Buscar partido o condición'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='Buscar apuestas...'
          className='w-full rounded-md border border-white/10 bg-surface py-2 pr-9 pl-9 text-sm text-white transition-colors duration-150 placeholder:text-slate-500 focus:border-brand focus:outline-none'
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            aria-label='Limpiar búsqueda'
            className='absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-slate-500 transition-colors hover:text-white'
          >
            <X className='h-3.5 w-3.5' />
          </button>
        )}
      </div>

      {/* Tabs de filtro */}
      <div
        role='tablist'
        aria-label='Filtrar apuestas'
        className='scrollbar-none flex items-center gap-1.5 overflow-x-auto pb-1'
      >
        {filterTabs.map((tab) => {
          const isActive = filter === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              role='tab'
              aria-selected={isActive}
              className={clsx(
                'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150',
                isActive
                  ? 'border-transparent bg-brand text-white'
                  : 'border-white/10 bg-surface text-slate-400 hover:border-white/25 hover:text-white',
              )}
            >
              {tab.isLive && (
                <span
                  className={clsx(
                    'h-1.5 w-1.5 rounded-full',
                    isActive ? 'bg-white' : 'animate-pulse bg-red-500',
                  )}
                />
              )}
              <span>{tab.label}</span>
              <span
                className={clsx(
                  'font-mono-numbers rounded-full px-1.5 text-[10px]',
                  isActive ? 'bg-black/25' : 'bg-white/5',
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Resumen según filtro activo */}
      {filter === 'WON' && counts.won > 0 && (
        <div className='font-mono-numbers flex items-center justify-between rounded-md border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-300'>
          <span className='flex items-center gap-2 font-semibold'>
            Ganancia neta:
            <span className='text-sm font-bold text-emerald-400'>
              +{currencySymbol}
              {wonProfit}
            </span>
          </span>
          <span className='text-[11px] text-emerald-400/80'>
            {counts.won} {counts.won === 1 ? 'ganada' : 'ganadas'}
          </span>
        </div>
      )}

      {filter === 'LIVE' && counts.live > 0 && (
        <div className='font-mono-numbers flex items-center justify-between rounded-md border border-orange-500/25 bg-orange-500/5 px-3 py-2.5 text-xs text-orange-300'>
          <span className='flex items-center gap-2 font-semibold'>
            <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-red-500' />
            En juego: {currencySymbol}
            {liveStake}
          </span>
          <span className='font-bold text-orange-400'>
            Retorno: {currencySymbol}
            {livePayout}
          </span>
        </div>
      )}
    </div>
  );
};
