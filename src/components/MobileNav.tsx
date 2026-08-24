import React from 'react';
import { useBets } from '../context/BetContext';
import type { AppView } from '../App';
import { LayoutGrid, Radio, Plus, TrendingUp, Zap, NotebookPen } from 'lucide-react';

interface MobileNavProps {
  view: AppView;
  onChangeView: (view: AppView) => void;
  onOpenAddModal: () => void;
  onOpenAnalyticsModal: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  view,
  onChangeView,
  onOpenAddModal,
  onOpenAnalyticsModal,
}) => {
  const { filter, setFilter, isSimulating, toggleSimulation, counts } =
    useBets();
  const liveCount = counts.live;

  return (
    <nav
      aria-label='Navegación móvil'
      className='md:hidden fixed bottom-0 left-0 right-0 z-40 bg-base/95 backdrop-blur-lg border-t border-white/10 px-2 py-2 flex items-center justify-around'
    >
      {/* Tab 1: Dashboard / Todas */}
      <button
        onClick={() => {
          onChangeView('dashboard');
          setFilter('ALL');
        }}
        aria-label='Ver todas las apuestas'
        aria-current={view === 'dashboard' && filter === 'ALL' ? 'page' : undefined}
        className={`flex flex-col items-center gap-1 text-[10px] font-mono font-semibold transition-colors ${
          view === 'dashboard' && filter === 'ALL'
            ? 'text-brand'
            : 'text-slate-400'
        }`}
      >
        <LayoutGrid className='w-5 h-5' />
        <span>Panel</span>
      </button>

      {/* Tab 2: En Vivo */}
      <button
        onClick={() => {
          onChangeView('dashboard');
          setFilter('LIVE');
        }}
        aria-label={`Apuestas en vivo (${liveCount})`}
        aria-current={view === 'dashboard' && filter === 'LIVE' ? 'page' : undefined}
        className={`flex flex-col items-center gap-1 text-[10px] font-mono font-semibold relative transition-colors ${
          view === 'dashboard' && filter === 'LIVE'
            ? 'text-brand'
            : 'text-slate-400'
        }`}
      >
        <div className='relative'>
          <Radio
            className={`w-5 h-5 ${liveCount > 0 ? 'text-red-400 animate-pulse' : ''}`}
          />
          {liveCount > 0 && (
            <span className='absolute -top-1 -right-2 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center font-mono'>
              {liveCount}
            </span>
          )}
        </div>
        <span>En Vivo</span>
      </button>

      {/* Center Action: + Nueva Apuesta */}
      <button
        onClick={onOpenAddModal}
        aria-label='Crear apuesta'
        className='w-12 h-12 -mt-5 rounded-full bg-gradient-to-tr from-brand to-orange-400 text-white flex items-center justify-center shadow-lg shadow-orange-950/60 border-2 border-base active:scale-95 transition-all'
      >
        <Plus className='w-6 h-6 stroke-[3]' />
      </button>

      {/* Tab 3: Notas (Diario) */}
      <button
        onClick={() => onChangeView('notes')}
        aria-label='Abrir diario de notas'
        aria-current={view === 'notes' ? 'page' : undefined}
        className={`flex flex-col items-center gap-1 text-[10px] font-mono font-semibold transition-colors ${
          view === 'notes' ? 'text-brand' : 'text-slate-400'
        }`}
      >
        <NotebookPen className='w-5 h-5' />
        <span>Notas</span>
      </button>

      {/* Tab 4: Métricas */}
      <button
        onClick={onOpenAnalyticsModal}
        aria-label='Ver métricas'
        className='flex flex-col items-center gap-1 text-[10px] font-mono font-semibold text-slate-400 hover:text-white transition-colors'
      >
        <TrendingUp className='w-5 h-5' />
        <span>Métricas</span>
      </button>

      {/* Tab 5: Simulador */}
      <button
        onClick={toggleSimulation}
        aria-label={
          isSimulating ? 'Desactivar simulador' : 'Activar simulador'
        }
        aria-pressed={isSimulating}
        className={`flex flex-col items-center gap-1 text-[10px] font-mono font-semibold transition-colors ${
          isSimulating ? 'text-emerald-400' : 'text-slate-400'
        }`}
      >
        <Zap
          className={`w-5 h-5 ${isSimulating ? 'text-emerald-400 fill-emerald-400 animate-bounce' : ''}`}
        />
        <span>{isSimulating ? 'ON' : 'OFF'}</span>
      </button>
    </nav>
  );
};
