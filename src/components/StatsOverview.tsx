import React from 'react'
import { useBets } from '../context/BetContext'

export const StatsOverview: React.FC = () => {
  const { stats, currencySymbol } = useBets()

  return (
    <div className="bg-[#12141C] border border-white/10 rounded-lg p-3.5 my-4 flex items-center justify-between gap-2 shadow-sm">
      
      {/* Stat 1: Bankroll */}
      <div className="text-left flex-1">
        <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold block">
          Bankroll
        </span>
        <span className="text-lg sm:text-xl font-black text-white font-mono-numbers">
          {currencySymbol}{stats.bankroll.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="h-8 w-px bg-white/10" />

      {/* Stat 2: Beneficio */}
      <div className="text-center flex-1">
        <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold block">
          Ganancia ({stats.roi > 0 ? `+${stats.roi}%` : `${stats.roi}%`})
        </span>
        <span className={`text-lg sm:text-xl font-bold font-mono-numbers ${
          stats.netProfit >= 0 ? 'text-[#00E676]' : 'text-[#FF3344]'
        }`}>
          {stats.netProfit >= 0 ? '+' : ''}{currencySymbol}{stats.netProfit.toFixed(2)}
        </span>
      </div>

      <div className="h-8 w-px bg-white/10" />

      {/* Stat 3: En Vivo */}
      <div className="text-right flex-1">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">
          En Vivo
        </span>
        <div className="flex items-center justify-end gap-1.5">
          {stats.liveBets > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
          <span className="text-lg sm:text-xl font-bold text-white font-mono-numbers">
            {stats.liveBets} <span className="text-xs text-slate-400 font-normal">activas</span>
          </span>
        </div>
      </div>

    </div>
  )
}
