import React from 'react'
import { useBets } from '../context/BetContext'
import { LayoutGrid, Radio, Plus, TrendingUp, Zap } from 'lucide-react'

interface MobileNavProps {
  onOpenAddModal: () => void
  onOpenAnalyticsModal: () => void
}

export const MobileNav: React.FC<MobileNavProps> = ({
  onOpenAddModal,
  onOpenAnalyticsModal,
}) => {
  const { filter, setFilter, isSimulating, toggleSimulation, bets } = useBets()
  const liveCount = bets.filter(b => b.status === 'LIVE').length

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0C10]/95 backdrop-blur-lg border-t border-white/10 px-3 py-2 flex items-center justify-around">
      
      {/* Tab 1: Dashboard / Todas */}
      <button
        onClick={() => setFilter('ALL')}
        className={`flex flex-col items-center gap-1 text-[10px] font-mono font-semibold transition-colors ${
          filter === 'ALL' ? 'text-[#FF5500]' : 'text-slate-400'
        }`}
      >
        <LayoutGrid className="w-5 h-5" />
        <span>Panel</span>
      </button>

      {/* Tab 2: En Vivo */}
      <button
        onClick={() => setFilter('LIVE')}
        className={`flex flex-col items-center gap-1 text-[10px] font-mono font-semibold relative transition-colors ${
          filter === 'LIVE' ? 'text-[#FF5500]' : 'text-slate-400'
        }`}
      >
        <div className="relative">
          <Radio className={`w-5 h-5 ${liveCount > 0 ? 'text-red-400 animate-pulse' : ''}`} />
          {liveCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center font-mono">
              {liveCount}
            </span>
          )}
        </div>
        <span>En Vivo</span>
      </button>

      {/* Center Action: + Nueva Apuesta */}
      <button
        onClick={onOpenAddModal}
        className="w-12 h-12 -mt-5 rounded-full bg-gradient-to-tr from-[#FF5500] to-orange-400 text-white flex items-center justify-center shadow-lg shadow-orange-950/60 border-2 border-[#0B0C10] active:scale-95 transition-all"
        title="Crear Apuesta"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      {/* Tab 3: Métricas */}
      <button
        onClick={onOpenAnalyticsModal}
        className="flex flex-col items-center gap-1 text-[10px] font-mono font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <TrendingUp className="w-5 h-5" />
        <span>Métricas</span>
      </button>

      {/* Tab 4: Simulador */}
      <button
        onClick={toggleSimulation}
        className={`flex flex-col items-center gap-1 text-[10px] font-mono font-semibold transition-colors ${
          isSimulating ? 'text-emerald-400' : 'text-slate-400'
        }`}
      >
        <Zap className={`w-5 h-5 ${isSimulating ? 'text-emerald-400 fill-emerald-400 animate-bounce' : ''}`} />
        <span>{isSimulating ? 'Sim: ON' : 'Sim: OFF'}</span>
      </button>

    </div>
  )
}
