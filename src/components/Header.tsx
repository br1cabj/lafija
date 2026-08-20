import React, { useState } from 'react'
import { useBets } from '../context/BetContext'
import { useAuth } from '../context/AuthContext'
import { sounds } from '../utils/audio'
import { Plus, Zap, BarChart2, User, LogOut, Shield, Volume2, VolumeX, RotateCcw, Trash2, DollarSign } from 'lucide-react'

interface HeaderProps {
  onOpenAddModal: () => void
  onOpenAnalyticsModal: () => void
}

export const Header: React.FC<HeaderProps> = ({ onOpenAddModal, onOpenAnalyticsModal }) => {
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
    restoreDemoBets
  } = useBets()
  const { user, openAuthModal, signOut } = useAuth()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isMuted, setIsMuted] = useState(sounds.isMuted)

  const handleToggleSound = () => {
    const nextMuted = sounds.toggleMute()
    setIsMuted(nextMuted)
    if (!nextMuted) {
      sounds.playClickSound()
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-[#0B0C10]/95 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#FF5500] flex items-center justify-center font-black text-white text-sm shadow-md shadow-orange-950/50">
            LF
          </div>
          <div>
            <h1 className="text-base font-black tracking-wider text-white uppercase italic leading-none">
              LA<span className="text-[#FF5500]">FIJA</span>
            </h1>
            <span className="text-[10px] font-mono text-slate-400">
              LVL {stats.faceitLevel} • {stats.winRate}% WIN
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          
          {/* Compact Odds Format Selector */}
          <div className="flex items-center bg-[#161822] border border-white/10 rounded p-0.5 text-[11px] font-mono">
            <button
              onClick={() => setOddsFormat('decimal')}
              className={`px-2 py-0.5 rounded transition-all ${
                oddsFormat === 'decimal' ? 'bg-[#FF5500] text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              DEC
            </button>
            <button
              onClick={() => setOddsFormat('american')}
              className={`px-2 py-0.5 rounded transition-all ${
                oddsFormat === 'american' ? 'bg-[#FF5500] text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              AME
            </button>
            <button
              onClick={() => setOddsFormat('fractional')}
              className={`hidden sm:block px-2 py-0.5 rounded transition-all ${
                oddsFormat === 'fractional' ? 'bg-[#FF5500] text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              FRA
            </button>
            <button
              onClick={() => setOddsFormat('implied')}
              className={`hidden md:block px-2 py-0.5 rounded transition-all ${
                oddsFormat === 'implied' ? 'bg-[#FF5500] text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              IMP
            </button>
          </div>

          {/* Quick Sim Toggle */}
          <button
            onClick={toggleSimulation}
            className={`p-1.5 rounded border transition-all ${
              isSimulating
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                : 'bg-[#161822] border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Simulador en vivo"
          >
            <Zap className={`w-4 h-4 ${isSimulating ? 'text-emerald-400 fill-emerald-400 animate-pulse' : ''}`} />
          </button>

          {/* Sound FX Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-1.5 rounded border transition-all ${
              !isMuted
                ? 'bg-[#161822] border-white/10 text-orange-400 hover:text-orange-300'
                : 'bg-[#161822] border-white/10 text-slate-500 hover:text-slate-300'
            }`}
            title={isMuted ? 'Efectos de sonido silenciados' : 'Efectos de sonido activos'}
          >
            {!isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Analytics button */}
          <button
            onClick={onOpenAnalyticsModal}
            className="p-1.5 rounded bg-[#161822] border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Ver estadísticas"
          >
            <BarChart2 className="w-4 h-4" />
          </button>

          {/* Compact Currency Switcher */}
          <div className="flex items-center bg-[#161822] border border-white/10 rounded p-0.5 text-[11px] font-mono">
            <button
              onClick={() => setCurrency('ARS')}
              className={`px-1.5 py-0.5 rounded transition-all ${
                currency === 'ARS' ? 'bg-[#FF5500] text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Pesos Argentinos"
            >
              ARS
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-1.5 py-0.5 rounded transition-all ${
                currency === 'USD' ? 'bg-[#FF5500] text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Dólares USD"
            >
              USD
            </button>
          </div>

          {/* User Auth Profile Button / Dropdown */}
          <div className="relative">
            {user ? (
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#FF5500] to-orange-400 text-white font-bold text-xs flex items-center justify-center border border-orange-400/40 shadow-sm"
                title={user.name}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </button>
            ) : (
              <button
                onClick={openAuthModal}
                className="flex items-center gap-1 bg-[#161822] border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs px-2.5 py-1 rounded transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}

            {/* Profile Dropdown */}
            {showProfileMenu && user && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute right-0 top-8 z-50 bg-[#161822] border border-white/15 rounded-lg shadow-2xl py-2 w-56 text-xs text-slate-200">
                  <div className="px-3 pb-2 border-b border-white/10">
                    <p className="font-bold text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-orange-400 font-mono">
                      <Shield className="w-3 h-3" />
                      <span>ELO {stats.eloRating} PTS • LVL {stats.faceitLevel}</span>
                    </div>
                  </div>

                  {/* Reset / Demo Data Tools */}
                  <div className="py-1 border-b border-white/10">
                    <button
                      onClick={() => {
                        const input = prompt('Ingresa tu Bankroll inicial:', String(initialBankroll))
                        if (input !== null) {
                          const val = parseFloat(input)
                          if (!isNaN(val) && val >= 0) {
                            setInitialBankroll(val)
                          }
                        }
                        setShowProfileMenu(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-white/5 flex items-center gap-2 transition-colors text-[11px]"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-orange-400" />
                      <span>Ajustar Bankroll inicial ({currencySymbol}{initialBankroll.toFixed(2)})</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('¿Vaciar todas las apuestas y empezar en blanco?')) {
                          clearAllBets()
                          setShowProfileMenu(false)
                        }
                      }}
                      className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-white/5 flex items-center gap-2 transition-colors text-[11px]"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-orange-400" />
                      <span>Vaciar datos / Empezar en blanco</span>
                    </button>
                    <button
                      onClick={() => {
                        restoreDemoBets()
                        setShowProfileMenu(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-white/5 flex items-center gap-2 transition-colors text-[11px]"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Restaurar apuestas de demo</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      signOut()
                      setShowProfileMenu(false)
                    }}
                    className="w-full text-left px-3 py-2 text-red-400 hover:bg-white/5 flex items-center gap-2 transition-colors font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* + Nueva Apuesta */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 bg-[#FF5500] hover:bg-[#FF661A] text-white font-bold text-xs uppercase px-3 py-1.5 rounded shadow active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva</span>
          </button>
        </div>

      </div>
    </header>
  )
}
