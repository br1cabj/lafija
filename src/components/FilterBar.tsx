import React, { useMemo } from 'react';
import { useBets } from '../context/BetContext';
import { Search } from 'lucide-react';

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
    { id: 'ALL', label: 'Todas', count: counts.all },
    { id: 'LIVE', label: 'En Vivo', count: counts.live, isLive: true },
    { id: 'PENDING', label: 'Pendientes', count: counts.pending },
    { id: 'WON', label: 'Ganadas', count: counts.won },
  ];

  return (
    <div className='space-y-2.5 mb-4'>
      {/* Search Input (Subtle) */}
      <div className='relative w-full'>
        <Search className='w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500' />
        <input
          type='search'
          aria-label='Buscar partido o condición'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='Buscar partido o condición...'
          className='w-full bg-surface border border-white/5 focus:border-brand pl-8 pr-3 py-1.5 rounded text-xs text-white placeholder-slate-500 focus:outline-none'
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            aria-label='Limpiar búsqueda'
            className='absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white'
          >
            ✕
          </button>
        )}
      </div>

      {/* Clean Tabs */}
      <div
        role='tablist'
        aria-label='Filtrar apuestas'
        className='flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none'
      >
        {filterTabs.map((tab) => {
          const isActive = filter === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              role='tab'
              aria-selected={isActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-brand text-white shadow-sm shadow-orange-950/40 font-bold'
                  : 'bg-surface text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {tab.isLive && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-red-500 animate-pulse'}`}
                />
              )}
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1 rounded ${isActive ? 'bg-black/20 text-white' : 'text-slate-500'}`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Revenue / Status Summary Banner */}
      {filter === 'WON' && counts.won > 0 && (
        <div className='p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs font-mono text-emerald-300'>
          <span className='flex items-center gap-1.5 font-bold'>
            <span>🎉 Ganancia Neta:</span>
            <span className='text-emerald-400 font-extrabold text-sm'>
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
        <div className='p-2.5 bg-orange-950/40 border border-orange-500/30 rounded-lg flex items-center justify-between text-xs font-mono text-orange-300'>
          <span className='flex items-center gap-1.5 font-semibold'>
            <span className='w-2 h-2 rounded-full bg-red-500 animate-pulse' />
            <span>
              En Juego: {currencySymbol}
              {liveStake}
            </span>
          </span>
          <span className='text-brand font-bold'>
            Retorno: {currencySymbol}
            {livePayout}
          </span>
        </div>
      )}
    </div>
  );
};
