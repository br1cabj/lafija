import React, { useState, useRef } from 'react';
import { useBets } from '../context/BetContext';
import { useAuth } from '../context/AuthContext';
import { useClickOutside } from '../hooks/useClickOutside';
import { sounds } from '../utils/audio';
import { OddsFormatTabs } from './ui/OddsFormatTabs';
import { ConfirmDialog, NumberInputDialog } from './ui/Dialogs';
import {
  Plus,
  Zap,
  BarChart2,
  User,
  LogOut,
  Shield,
  Volume2,
  VolumeX,
  Trash2,
  DollarSign,
  NotebookPen,
} from 'lucide-react';
import type { AppView } from '../App';

interface HeaderProps {
  onOpenAddModal: () => void;
  onOpenAnalyticsModal: () => void;
  onOpenNotes: () => void;
  activeView: AppView;
}

type HeaderDialog = 'bankroll' | 'clear' | null;

export const Header: React.FC<HeaderProps> = ({
  onOpenAddModal,
  onOpenAnalyticsModal,
  onOpenNotes,
  activeView,
}) => {
  const {
    stats,
    initialBankroll,
    setInitialBankroll,
    isSimulating,
    toggleSimulation,
    oddsFormat,
    setOddsFormat,
    currency,
    setCurrency,
    currencySymbol,
    clearAllBets,
  } = useBets();
  const { user, openAuthModal, signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.isMuted);
  const [dialog, setDialog] = useState<HeaderDialog>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useClickOutside(profileRef, () => setShowProfileMenu(false), showProfileMenu);

  // Escape closes the dropdown
  React.useEffect(() => {
    if (!showProfileMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowProfileMenu(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showProfileMenu]);

  const handleToggleSound = () => {
    const nextMuted = sounds.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      sounds.playClickSound();
    }
  };

  return (
    <header className='sticky top-0 z-40 bg-base/95 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3'>
      <div className='max-w-7xl mx-auto flex items-center justify-between gap-3'>
        {/* Brand */}
        <div className='flex items-center gap-2.5'>
          <div className='w-8 h-8 rounded bg-brand flex items-center justify-center font-black text-white text-sm shadow-md shadow-orange-950/50'>
            LF
          </div>
          <div>
            <h1 className='text-base font-black tracking-wider text-white uppercase italic leading-none'>
              LA<span className='text-brand'>FIJA</span>
            </h1>
            <span className='text-[10px] font-mono text-slate-400'>
              LVL {stats.rankLevel} • {stats.winRate}% WIN
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className='flex items-center gap-2'>
          {/* Compact Odds Format Selector */}
          <OddsFormatTabs
            variant='compact'
            value={oddsFormat}
            onChange={setOddsFormat}
          />

          {/* Quick Sim Toggle */}
          <button
            onClick={toggleSimulation}
            aria-label='Simulador en vivo'
            aria-pressed={isSimulating}
            className={`p-1.5 rounded border transition-all ${
              isSimulating
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                : 'bg-panel border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Zap
              className={`w-4 h-4 ${isSimulating ? 'text-emerald-400 fill-emerald-400 animate-pulse' : ''}`}
            />
          </button>

          {/* Sound FX Toggle */}
          <button
            onClick={handleToggleSound}
            aria-label={
              isMuted
                ? 'Activar efectos de sonido'
                : 'Silenciar efectos de sonido'
            }
            aria-pressed={!isMuted}
            className={`p-1.5 rounded border transition-all ${
              !isMuted
                ? 'bg-panel border-white/10 text-orange-400 hover:text-orange-300'
                : 'bg-panel border-white/10 text-slate-500 hover:text-slate-300'
            }`}
          >
            {!isMuted ? (
              <Volume2 className='w-4 h-4' />
            ) : (
              <VolumeX className='w-4 h-4' />
            )}
          </button>

          {/* Notes / Diario button */}
          <button
            onClick={onOpenNotes}
            aria-label='Diario de notas'
            aria-current={activeView === 'notes' ? 'page' : undefined}
            className={`p-1.5 rounded border transition-colors ${
              activeView === 'notes'
                ? 'bg-orange-500/20 border-brand/50 text-brand'
                : 'bg-panel border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <NotebookPen className='w-4 h-4' />
          </button>

          {/* Analytics button */}
          <button
            onClick={onOpenAnalyticsModal}
            aria-label='Ver estadísticas'
            className='p-1.5 rounded bg-panel border border-white/10 text-slate-300 hover:text-white transition-colors'
          >
            <BarChart2 className='w-4 h-4' />
          </button>

          {/* Compact Currency Switcher */}
          <div className='flex items-center bg-panel border border-white/10 rounded p-0.5 text-[11px] font-mono'>
            <button
              onClick={() => setCurrency('ARS')}
              aria-pressed={currency === 'ARS'}
              aria-label='Moneda: Pesos Argentinos'
              className={`px-1.5 py-0.5 rounded transition-all ${
                currency === 'ARS'
                  ? 'bg-brand text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ARS
            </button>
            <button
              onClick={() => setCurrency('USD')}
              aria-pressed={currency === 'USD'}
              aria-label='Moneda: Dólares USD'
              className={`px-1.5 py-0.5 rounded transition-all ${
                currency === 'USD'
                  ? 'bg-brand text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              USD
            </button>
          </div>

          {/* User Auth Profile Button / Dropdown */}
          <div className='relative' ref={profileRef}>
            {user ? (
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                aria-label={`Perfil de ${user.name}`}
                aria-expanded={showProfileMenu}
                className='w-7 h-7 rounded-full bg-gradient-to-tr from-brand to-orange-400 text-white font-bold text-xs flex items-center justify-center border border-orange-400/40 shadow-sm'
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className='w-full h-full rounded-full object-cover'
                  />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </button>
            ) : (
              <button
                onClick={openAuthModal}
                className='flex items-center gap-1 bg-panel border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs px-2.5 py-1 rounded transition-colors'
              >
                <User className='w-3.5 h-3.5' />
                <span>Entrar</span>
              </button>
            )}

            {/* Profile Dropdown */}
            {showProfileMenu && user && (
              <div className='absolute right-0 top-8 z-50 bg-panel border border-white/15 rounded-lg shadow-2xl py-2 w-56 text-xs text-slate-200'>
                <div className='px-3 pb-2 border-b border-white/10'>
                  <p className='font-bold text-white truncate'>{user.name}</p>
                  <p className='text-[11px] text-slate-400 truncate'>
                    {user.email}
                  </p>
                  <div className='mt-1 flex items-center gap-1 text-[10px] text-orange-400 font-mono'>
                    <Shield className='w-3 h-3' />
                    <span>
                      ELO {stats.eloRating} PTS • LVL {stats.rankLevel}
                    </span>
                  </div>
                </div>

                {/* Reset / Demo Data Tools */}
                <div className='py-1 border-b border-white/10'>
                  <button
                    onClick={() => {
                      setDialog('bankroll');
                      setShowProfileMenu(false);
                    }}
                    className='w-full text-left px-3 py-1.5 text-slate-300 hover:bg-white/5 flex items-center gap-2 transition-colors text-[11px]'
                  >
                    <DollarSign className='w-3.5 h-3.5 text-brand' />
                    <span>
                      Ajustar Bankroll inicial ({currencySymbol}
                      {initialBankroll.toFixed(2)})
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setDialog('clear');
                      setShowProfileMenu(false);
                    }}
                    className='w-full text-left px-3 py-1.5 text-slate-300 hover:bg-white/5 flex items-center gap-2 transition-colors text-[11px]'
                  >
                    <Trash2 className='w-3.5 h-3.5 text-brand' />
                    <span>Vaciar datos / Empezar en blanco</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    signOut();
                    setShowProfileMenu(false);
                  }}
                  className='w-full text-left px-3 py-2 text-red-400 hover:bg-white/5 flex items-center gap-2 transition-colors font-semibold'
                >
                  <LogOut className='w-3.5 h-3.5' />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>

          {/* + Nueva Apuesta */}
          <button
            onClick={onOpenAddModal}
            className='flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase px-3 py-1.5 rounded shadow active:scale-95 transition-all'
          >
            <Plus className='w-4 h-4' />
            <span className='hidden sm:inline'>Nueva</span>
          </button>
        </div>
      </div>

      {/* Dialogs (reemplazan prompt/confirm nativos) */}
      <NumberInputDialog
        isOpen={dialog === 'bankroll'}
        onClose={() => setDialog(null)}
        title='Ajustar Bankroll Inicial'
        label='Bankroll inicial'
        initialValue={String(initialBankroll)}
        submitLabel='Guardar'
        validate={(v) => {
          const n = parseFloat(v.replace(',', '.'));
          if (isNaN(n)) return 'Ingresa un número válido.';
          if (n < 0) return 'El bankroll no puede ser negativo.';
          return null;
        }}
        onSubmit={(value) => setInitialBankroll(value)}
      />

      <ConfirmDialog
        isOpen={dialog === 'clear'}
        onClose={() => setDialog(null)}
        title='Vaciar todos los datos'
        message='Se eliminarán todas las apuestas registradas y el historial de eventos. Esta acción no se puede deshacer.'
        confirmLabel='Vaciar todo'
        destructive
        onConfirm={clearAllBets}
      />
    </header>
  );
};
