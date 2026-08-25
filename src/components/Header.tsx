import React, { useState, useRef } from 'react';
import { useBets } from '../context/BetContext';
import { useAuth } from '../context/AuthContext';
import { useClickOutside } from '../hooks/useClickOutside';
import { OddsFormatTabs } from './ui/OddsFormatTabs';
import { ConfirmDialog, NumberInputDialog } from './ui/Dialogs';
import { Button, IconButton } from './ui/Button';
import {
  Plus,
  BarChart2,
  User,
  LogOut,
  Shield,
  Trash2,
  DollarSign,
  Download,
  NotebookPen,
} from 'lucide-react';

interface HeaderProps {
  onOpenAddModal: () => void;
  onOpenAnalyticsModal: () => void;
  onOpenNotes: () => void;
}

type HeaderDialog = 'bankroll' | 'clear' | null;

export const Header: React.FC<HeaderProps> = ({
  onOpenAddModal,
  onOpenAnalyticsModal,
  onOpenNotes,
}) => {
  const {
    stats,
    initialBankroll,
    setInitialBankroll,
    oddsFormat,
    setOddsFormat,
    currency,
    setCurrency,
    currencySymbol,
    clearAllBets,
    exportBackup,
  } = useBets();
  const { user, openAuthModal, signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [dialog, setDialog] = useState<HeaderDialog>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useClickOutside(profileRef, () => setShowProfileMenu(false), showProfileMenu);

  // Escape cierra el dropdown de perfil
  React.useEffect(() => {
    if (!showProfileMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowProfileMenu(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showProfileMenu]);

  return (
    <header className='sticky top-0 z-40 border-b border-white/10 bg-base/95 px-4 py-3 backdrop-blur-md lg:px-8'>
      <div className='mx-auto flex max-w-7xl items-center justify-between gap-3'>
        {/* Brand */}
        <div className='flex items-center gap-2.5'>
          <img
            src='/icons/logo.png'
            alt='LA FIJA'
            className='h-9 w-9 rounded-md object-contain'
            draggable={false}
          />
          <div>
            <h1 className='text-base leading-none font-bold tracking-tight text-white'>
              LA<span className='text-brand'>FIJA</span>
            </h1>
            <span className='font-mono-numbers text-[10px] text-slate-400'>
              Nivel {stats.rankLevel} · {stats.winRate}% victorias
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className='flex items-center gap-2'>
          {/* Odds Format */}
          <OddsFormatTabs
            variant='compact'
            value={oddsFormat}
            onChange={setOddsFormat}
          />

          {/* Currency Switcher */}
          <div className='flex items-center rounded-sm border border-white/10 bg-panel p-0.5 text-[11px]'>
            {(['ARS', 'USD'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                aria-pressed={currency === c}
                aria-label={`Moneda: ${c === 'ARS' ? 'Pesos Argentinos' : 'Dólares USD'}`}
                className={`rounded-sm px-1.5 py-0.5 font-semibold transition-colors ${
                  currency === c
                    ? 'bg-brand text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Navegación directa (desktop; en móvil son tabs del nav inferior) */}
          <IconButton
            onClick={onOpenNotes}
            aria-label='Diario de notas'
            title='Diario de notas'
            className='hidden md:inline-flex'
          >
            <NotebookPen className='h-4 w-4' />
          </IconButton>
          <IconButton
            onClick={onOpenAnalyticsModal}
            aria-label='Ver estadísticas'
            title='Estadísticas'
            className='hidden md:inline-flex'
          >
            <BarChart2 className='h-4 w-4' />
          </IconButton>

          {/* User Auth Profile Button / Dropdown */}
          <div className='relative' ref={profileRef}>
            {user ? (
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                aria-label={`Perfil de ${user.name}`}
                aria-expanded={showProfileMenu}
                className='flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-brand text-xs font-semibold text-white'
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className='h-full w-full rounded-full object-cover'
                  />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </button>
            ) : (
              <Button size='sm' variant='secondary' onClick={openAuthModal}>
                <User className='h-3.5 w-3.5' />
                <span>Entrar</span>
              </Button>
            )}

            {/* Profile Dropdown */}
            {showProfileMenu && user && (
              <div className='absolute right-0 top-9 z-50 w-56 rounded-lg border border-white/15 bg-panel py-1.5 text-xs text-slate-200 shadow-2xl'>
                <div className='border-b border-white/10 px-3 pb-2'>
                  <p className='truncate font-semibold text-white'>
                    {user.name}
                  </p>
                  <p className='truncate text-[11px] text-slate-400'>
                    {user.email}
                  </p>
                  <div className='font-mono-numbers mt-1 flex items-center gap-1 text-[10px] text-orange-400'>
                    <Shield className='h-3 w-3' />
                    <span>
                      ELO {stats.eloRating} · Nivel {stats.rankLevel}
                    </span>
                  </div>
                </div>

                {/* Reset / Demo Data Tools */}
                <div className='border-b border-white/10 py-1'>
                  <button
                    onClick={() => {
                      setDialog('bankroll');
                      setShowProfileMenu(false);
                    }}
                    className='flex w-full items-center gap-2.5 px-3 py-2 text-left text-slate-300 transition-colors hover:bg-white/5'
                  >
                    <DollarSign className='h-4 w-4 text-brand' />
                    <span>
                      Bankroll inicial ({currencySymbol}
                      {initialBankroll.toFixed(2)})
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setDialog('clear');
                      setShowProfileMenu(false);
                    }}
                    className='flex w-full items-center gap-2.5 px-3 py-2 text-left text-slate-300 transition-colors hover:bg-white/5'
                  >
                    <Trash2 className='h-4 w-4 text-red-400' />
                    <span>Vaciar datos</span>
                  </button>
                  <button
                    onClick={() => {
                      exportBackup();
                      setShowProfileMenu(false);
                    }}
                    className='flex w-full items-center gap-2.5 px-3 py-2 text-left text-slate-300 transition-colors hover:bg-white/5'
                  >
                    <Download className='h-4 w-4 text-slate-400' />
                    <span>Exportar backup (JSON)</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    signOut();
                    setShowProfileMenu(false);
                  }}
                  className='flex w-full items-center gap-2.5 px-3 py-2 text-left font-semibold text-red-400 transition-colors hover:bg-white/5'
                >
                  <LogOut className='h-4 w-4' />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary CTA */}
          <Button size='sm' variant='primary' onClick={onOpenAddModal}>
            <Plus className='h-4 w-4' />
            <span className='hidden sm:inline'>Nueva apuesta</span>
          </Button>
        </div>
      </div>

      {/* Dialogs (reemplazan prompt/confirm nativos) */}
      <NumberInputDialog
        isOpen={dialog === 'bankroll'}
        onClose={() => setDialog(null)}
        title='Ajustar bankroll inicial'
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
