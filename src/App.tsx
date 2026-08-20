import React, { useState } from 'react'
import { BetProvider, useBets } from './context/BetContext'
import { AuthProvider } from './context/AuthContext'
import { Header } from './components/Header'
import { PWAInstallBanner } from './components/PWAInstallBanner'
import { StatsOverview } from './components/StatsOverview'
import { FilterBar } from './components/FilterBar'
import { BetCard } from './components/BetCard'
import { AddBetModal } from './components/AddBetModal'
import { AnalyticsModal } from './components/AnalyticsModal'
import { AuthModal } from './components/AuthModal'
import { ShareTicketModal } from './components/ShareTicketModal'
import { MobileNav } from './components/MobileNav'
import { LiveFeedSidebar } from './components/LiveFeedSidebar'
import type { Bet } from './types/bet'
import { Plus, ShieldCheck, Zap } from 'lucide-react'

const DashboardContent: React.FC = () => {
  const { bets, filter, searchQuery } = useBets()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false)
  const [selectedBetForShare, setSelectedBetForShare] = useState<Bet | null>(null)

  // Global Escape key listener for open modals
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false)
        setIsAnalyticsModalOpen(false)
        setSelectedBetForShare(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Filtering logic
  const filteredBets = bets.filter(bet => {
    // Status filter
    if (filter === 'LIVE' && bet.status !== 'LIVE') return false
    if (filter === 'PENDING' && bet.status !== 'PENDING') return false
    if (filter === 'WON' && bet.status !== 'WON') return false
    if (filter === 'LOST' && bet.status !== 'LOST') return false
    if (filter === 'CLUTCH') {
      const isClutch = bet.status === 'LIVE' && bet.conditions.some(c => c.status === 'CLUTCH_DANGER')
      if (!isClutch) return false
    }

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchHome = bet.match.homeTeam.toLowerCase().includes(query)
      const matchAway = bet.match.awayTeam.toLowerCase().includes(query)
      const matchTitle = bet.title.toLowerCase().includes(query)
      const matchLeague = bet.league.toLowerCase().includes(query)
      const matchConditions = bet.conditions.some(c => c.selection.toLowerCase().includes(query) || c.market.toLowerCase().includes(query))
      if (!matchHome && !matchAway && !matchTitle && !matchLeague && !matchConditions) return false
    }

    return true
  })

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#F3F4F6] pb-24 md:pb-12">
      
      {/* PWA Mobile Install Prompt */}
      <PWAInstallBanner />

      {/* Main FACEIT Header */}
      <Header
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenAnalyticsModal={() => setIsAnalyticsModalOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 py-4">
        
        {/* Compact 3-Stat Strip */}
        <StatsOverview />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          
          {/* Main Bet Feed Column */}
          <div className="lg:col-span-2 space-y-3">
            {/* Minimal Filters */}
            <FilterBar />

            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400">
                {filteredBets.length} {filteredBets.length === 1 ? 'apuesta' : 'apuestas'}
              </span>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs font-mono font-bold text-[#FF5500] hover:text-orange-400 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Apuesta</span>
              </button>
            </div>

            {filteredBets.length === 0 ? (
              <div className="bg-[#12141C] border border-dashed border-white/10 rounded-lg p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto mb-2.5">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  No hay apuestas en esta vista
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Añade una nueva apuesta para iniciar el seguimiento en vivo.
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3.5 py-1.5 bg-[#FF5500] hover:bg-[#FF661A] text-white text-xs font-bold uppercase rounded shadow"
                >
                  + Crear Apuesta
                </button>
              </div>
            ) : (
              filteredBets.map(bet => (
                <BetCard
                  key={bet.id}
                  bet={bet}
                  onShare={(targetBet) => setSelectedBetForShare(targetBet)}
                />
              ))
            )}
          </div>

          {/* Desktop Right Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <LiveFeedSidebar />
          </div>

        </div>

      </main>

      {/* Modals */}
      <AddBetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <AnalyticsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
      />

      <ShareTicketModal
        bet={selectedBetForShare}
        isOpen={Boolean(selectedBetForShare)}
        onClose={() => setSelectedBetForShare(null)}
      />

      <AuthModal />

      {/* Mobile Bottom HUD Nav */}
      <MobileNav
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenAnalyticsModal={() => setIsAnalyticsModalOpen(true)}
      />

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 lg:px-8 mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-400 uppercase tracking-wider font-mono">
            LA FIJA v1.0
          </span>
          <span>•</span>
          <span>Tracker de Apuestas en Vivo</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" /> PWA Ready
          </span>
          <span>•</span>
          <span>WebSocket Realtime Engine</span>
        </div>
      </footer>

    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BetProvider>
        <DashboardContent />
      </BetProvider>
    </AuthProvider>
  )
}

export default App
