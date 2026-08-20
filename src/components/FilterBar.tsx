import React from 'react'
import { useBets } from '../context/BetContext'
import { Search } from 'lucide-react'

export const FilterBar: React.FC = () => {
  const {
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    bets,
    currencySymbol,
  } = useBets()

  const liveCount = bets.filter(b => b.status === 'LIVE').length
  const pendingCount = bets.filter(b => b.status === 'PENDING').length
  const wonCount = bets.filter(b => b.status === 'WON').length

  const filterTabs = [
    { id: 'ALL', label: 'Todas', count: bets.length },
    { id: 'LIVE', label: 'En Vivo', count: liveCount, isLive: true },
    { id: 'PENDING', label: 'Pendientes', count: pendingCount },
    { id: 'WON', label: 'Ganadas', count: wonCount },
  ]

  return (
    <div className="space-y-2.5 mb-4">
      
      {/* Search Input (Subtle) */}
      <div className="relative w-full">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar partido o condición..."
          className="w-full bg-[#12141C] border border-white/5 focus:border-[#FF5500] pl-8 pr-3 py-1.5 rounded text-xs text-white placeholder-slate-500 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Clean Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map(tab => {
          const isActive = filter === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#FF5500] text-white shadow-sm shadow-orange-950/40 font-bold'
                  : 'bg-[#12141C] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {tab.isLive && (
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-red-500 animate-pulse'}`} />
              )}
              <span>{tab.label}</span>
              <span className={`text-[10px] font-mono px-1 rounded ${isActive ? 'bg-black/20 text-white' : 'text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Filter Revenue / Status Summary Banner */}
      {filter === 'WON' && wonCount > 0 && (
        <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs font-mono text-emerald-300">
          <span className="flex items-center gap-1.5 font-bold">
            <span>🎉 Ganancia Neta:</span>
            <span className="text-emerald-400 font-extrabold text-sm">
              +{currencySymbol}{bets.filter(b => b.status === 'WON').reduce((acc, b) => acc + (b.potentialPayout - b.stake), 0).toFixed(2)}
            </span>
          </span>
          <span className="text-[11px] text-emerald-400/80">
            {wonCount} {wonCount === 1 ? 'ganada' : 'ganadas'}
          </span>
        </div>
      )}

      {filter === 'LIVE' && liveCount > 0 && (
        <div className="p-2.5 bg-orange-950/40 border border-orange-500/30 rounded-lg flex items-center justify-between text-xs font-mono text-orange-300">
          <span className="flex items-center gap-1.5 font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>En Juego: {currencySymbol}{bets.filter(b => b.status === 'LIVE').reduce((acc, b) => acc + b.stake, 0).toFixed(2)}</span>
          </span>
          <span className="text-orange-400 font-bold">
            Retorno: {currencySymbol}{bets.filter(b => b.status === 'LIVE').reduce((acc, b) => acc + b.potentialPayout, 0).toFixed(2)}
          </span>
        </div>
      )}

    </div>
  )
}
