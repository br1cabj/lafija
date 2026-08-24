import React, { lazy, Suspense, useCallback, useState } from 'react';
import { BetProvider, useBets } from './context/BetContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotesProvider } from './context/NotesContext';
import { Header } from './components/Header';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { StatsOverview } from './components/StatsOverview';
import { FilterBar } from './components/FilterBar';
import { BetCard } from './components/BetCard';
import { MobileNav } from './components/MobileNav';
import { LiveFeedSidebar } from './components/LiveFeedSidebar';
import type { Bet } from './types/bet';
import { isSupabaseConfigured } from './services/supabase';
import { Plus, ShieldCheck, Zap } from 'lucide-react';
import { Button } from './components/ui/Button';
import { ADS_ENABLED } from './config/ads';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PWAUpdateToast } from './components/PWAUpdateToast';
import { tryNativeShare } from './utils/shareTicket';

/* Modales y vistas secundarias: se descargan solo cuando se usan. */
const AddBetModal = lazy(() =>
  import('./components/AddBetModal').then((m) => ({ default: m.AddBetModal })),
);
const AnalyticsModal = lazy(() =>
  import('./components/AnalyticsModal').then((m) => ({
    default: m.AnalyticsModal,
  })),
);
const AuthModal = lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal })),
);
const ShareTicketModal = lazy(() =>
  import('./components/ShareTicketModal').then((m) => ({
    default: m.ShareTicketModal,
  })),
);
const NotesView = lazy(() =>
  import('./components/notes/NotesView').then((m) => ({
    default: m.NotesView,
  })),
);
const LiveResults = lazy(() =>
  import('./components/LiveResults').then((m) => ({ default: m.LiveResults })),
);

export type AppView = 'dashboard' | 'notes';

const DashboardContent: React.FC = () => {
  const {
    bets,
    filter,
    searchQuery,
    cloudSyncStatus,
    lastCloudSyncAt,
    retryCloudSync,
    oddsFormat,
    currencySymbol,
  } = useBets();
  const { user } = useAuth();
  const { isAuthModalOpen } = useAuth();
  const [view, setView] = useState<AppView>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [selectedBetForShare, setSelectedBetForShare] = useState<Bet | null>(
    null,
  );
  const [sharingBetId, setSharingBetId] = useState<string | null>(null);

  /** Móvil: sheet nativo del SO directo. Desktop/sin soporte: modal con preview. */
  const handleShare = useCallback(
    async (targetBet: Bet) => {
      setSharingBetId(targetBet.id);
      const result = await tryNativeShare(
        targetBet,
        oddsFormat,
        currencySymbol,
      ).finally(() => setSharingBetId(null));
      if (result !== 'shared') setSelectedBetForShare(targetBet);
    },
    [oddsFormat, currencySymbol],
  );

  // Filtering logic
  const filteredBets = bets.filter((bet) => {
    // Status filter
    if (filter === 'LIVE' && bet.status !== 'LIVE') return false;
    if (filter === 'PENDING' && bet.status !== 'PENDING') return false;
    if (filter === 'WON' && bet.status !== 'WON') return false;
    if (filter === 'LOST' && bet.status !== 'LOST') return false;
    if (filter === 'CLUTCH') {
      const isClutch =
        bet.status === 'LIVE' &&
        bet.conditions.some((c) => c.status === 'CLUTCH_DANGER');
      if (!isClutch) return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchHome = bet.match.homeTeam.toLowerCase().includes(query);
      const matchAway = bet.match.awayTeam.toLowerCase().includes(query);
      const matchTitle = bet.title.toLowerCase().includes(query);
      const matchLeague = bet.league.toLowerCase().includes(query);
      const matchConditions = bet.conditions.some(
        (c) =>
          c.selection.toLowerCase().includes(query) ||
          c.market.toLowerCase().includes(query),
      );
      if (
        !matchHome &&
        !matchAway &&
        !matchTitle &&
        !matchLeague &&
        !matchConditions
      )
        return false;
    }

    return true;
  });

  return (
    <div className='flex min-h-screen flex-col bg-base pb-28 text-[#F3F4F6] md:pb-0'>
      {/* PWA Mobile Install Prompt */}
      <PWAInstallBanner />

      {/* Main Header */}
      <Header
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenAnalyticsModal={() => setIsAnalyticsModalOpen(true)}
        onOpenNotes={() => setView('notes')}
        activeView={view}
      />

      {/* Main Container */}
      <main className='mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8'>
        {view === 'notes' ? (
          <Suspense fallback={null}>
            <NotesView />
          </Suspense>
        ) : (
          <>
            {/* Compact 3-Stat Strip */}
            <StatsOverview />

            {/* Resultados en vivo de los partidos con apuestas activas */}
            <Suspense fallback={null}>
              <LiveResults />
            </Suspense>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4'>
              {/* Main Bet Feed Column */}
              <div className='lg:col-span-2 space-y-3'>
                {/* Minimal Filters */}
                <FilterBar />

                <div className='mb-2 flex items-center justify-between'>
                  <span className='font-mono-numbers text-xs text-slate-500'>
                    {filteredBets.length}{' '}
                    {filteredBets.length === 1 ? 'apuesta' : 'apuestas'}
                  </span>

                  <Button
                    size='sm'
                    variant='ghost'
                    className='text-brand hover:bg-brand/10 hover:text-brand'
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    <Plus className='h-3.5 w-3.5' />
                    <span>Nueva apuesta</span>
                  </Button>
                </div>

                {filteredBets.length === 0 ? (
                  <div className='rounded-lg border border-dashed border-white/10 bg-surface p-10 text-center'>
                    <div className='mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-orange-500/10 text-orange-400'>
                      <Zap className='h-5 w-5' />
                    </div>
                    <h3 className='mb-1 text-sm font-semibold text-white'>
                      No hay apuestas en esta vista
                    </h3>
                    <p className='mb-4 text-xs text-slate-400'>
                      Añade una nueva apuesta para iniciar el seguimiento en
                      vivo.
                    </p>
                    <Button
                      variant='secondary'
                      onClick={() => setIsAddModalOpen(true)}
                    >
                      Crear apuesta
                    </Button>
                  </div>
                ) : (
                  filteredBets.map((bet) => (
                    <BetCard
                      key={bet.id}
                      bet={bet}
                      isSharing={sharingBetId === bet.id}
                      onShare={(targetBet) => void handleShare(targetBet)}
                    />
                  ))
                )}
              </div>

              {/* Desktop Right Sidebar */}
              <div className='hidden lg:block lg:col-span-1'>
                <LiveFeedSidebar />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modals - AddBetModal se monta fresco en cada apertura */}
      {isAddModalOpen && (
        <Suspense fallback={null}>
          <AddBetModal isOpen onClose={() => setIsAddModalOpen(false)} />
        </Suspense>
      )}

      {isAnalyticsModalOpen && (
        <Suspense fallback={null}>
          <AnalyticsModal
            isOpen
            onClose={() => setIsAnalyticsModalOpen(false)}
          />
        </Suspense>
      )}

      {selectedBetForShare && (
        <Suspense fallback={null}>
          <ShareTicketModal
            bet={selectedBetForShare}
            isOpen
            onClose={() => setSelectedBetForShare(null)}
          />
        </Suspense>
      )}

      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal />
        </Suspense>
      )}

      {/* Mobile Bottom HUD Nav */}
      <MobileNav
        view={view}
        onChangeView={setView}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenAnalyticsModal={() => setIsAnalyticsModalOpen(true)}
      />

      {/* Aviso de nueva versión del PWA */}
      <PWAUpdateToast />

      {/* Footer */}
      <footer className='mt-auto border-t border-white/5 bg-base/95 px-4 py-4 lg:px-8'>
        <div className='mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-xs text-slate-500 sm:flex-row'>
          <div className='flex items-center gap-2'>
            <span className='font-semibold tracking-wider text-slate-400 uppercase'>
              LA FIJA v2.0
            </span>
            <span>·</span>
            <span>Tracker de apuestas en vivo</span>
          </div>
          <div className='flex items-center gap-2 text-[11px]'>
          {isSupabaseConfigured && user && !user.isGuest ? (
            <>
              {cloudSyncStatus === 'error' ? (
                <button
                  onClick={retryCloudSync}
                  className='flex items-center gap-1.5 text-amber-400 transition-colors hover:text-amber-300'
                  title='Reintentar sincronización'
                >
                  <span className='h-1.5 w-1.5 rounded-full bg-amber-400' />
                  Error de sync · Reintentar
                </button>
              ) : cloudSyncStatus === 'syncing' ? (
                <span className='flex items-center gap-1.5 text-slate-400'>
                  <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400' />
                  Sincronizando…
                </span>
              ) : (
                <span
                  className='flex items-center gap-1.5 text-emerald-400'
                  title={
                    lastCloudSyncAt
                      ? `Última sincronización: ${new Date(lastCloudSyncAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                      : undefined
                  }
                >
                  <span className='h-1.5 w-1.5 rounded-full bg-emerald-400' />
                  {lastCloudSyncAt
                    ? `Sincronizado ${new Date(lastCloudSyncAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Sincronización activa'}
                </span>
              )}
              <span>·</span>
            </>
          ) : (
            <>
              <span className='flex items-center gap-1.5 text-slate-400'>
                <ShieldCheck className='h-3.5 w-3.5' /> Modo local
              </span>
              <span>·</span>
            </>
          )}
          <span>Instalable (PWA)</span>
          {ADS_ENABLED && (
            <>
              <span>·</span>
              <span>Contiene enlaces de afiliados</span>
            </>
          )}
          </div>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BetProvider>
          <NotesProvider>
            <DashboardContent />
          </NotesProvider>
        </BetProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
