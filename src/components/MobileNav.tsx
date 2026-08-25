import React from 'react';
import { useBets } from '../context/BetContext';
import type { AppView } from '../App';
import {
  LayoutGrid,
  Radio,
  Plus,
  TrendingUp,
  NotebookPen,
} from 'lucide-react';

interface MobileNavProps {
  view: AppView;
  onChangeView: (view: AppView) => void;
  onOpenAddModal: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  view,
  onChangeView,
  onOpenAddModal,
}) => {
  const { filter, setFilter, counts } = useBets();
  const liveCount = counts.live;

  return (
    <nav
      aria-label='Navegación móvil'
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      className='fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-base/95 px-2 pt-2 backdrop-blur-lg md:hidden flex items-center justify-around'
    >
      {/* Tab 1: Dashboard / Todas */}
      <button
        onClick={() => {
          onChangeView('dashboard');
          setFilter('ALL');
        }}
        aria-label='Ver todas las apuestas'
        aria-current={
          view === 'dashboard' && filter === 'ALL' ? 'page' : undefined
        }
        className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
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
        aria-current={
          view === 'dashboard' && filter === 'LIVE' ? 'page' : undefined
        }
        className={`flex flex-col items-center gap-1 text-[11px] font-semibold relative transition-colors ${
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
        className='w-12 h-12 -mt-5 rounded-full bg-brand text-white flex items-center justify-center shadow-lg shadow-black/40 active:scale-95 transition-all'
      >
        <Plus className='w-6 h-6 stroke-3' />
      </button>

      {/* Tab 3: Notas (Diario) */}
      <button
        onClick={() => onChangeView('notes')}
        aria-label='Abrir diario de notas'
        aria-current={view === 'notes' ? 'page' : undefined}
        className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
          view === 'notes' ? 'text-brand' : 'text-slate-400'
        }`}
      >
        <NotebookPen className='w-5 h-5' />
        <span>Notas</span>
      </button>

      {/* Tab 4: Métricas */}
      <button
        onClick={() => onChangeView('analytics')}
        aria-label='Ver métricas'
        className='flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors'
      >
        <TrendingUp className='w-5 h-5' />
        <span>Métricas</span>
      </button>
    </nav>
  );
};
