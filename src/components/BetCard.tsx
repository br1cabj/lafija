import React, { useState } from 'react'
import type { Bet, BetCondition } from '../types/bet'
import { useBets } from '../context/BetContext'
import { formatOdds } from '../utils/odds'
import { CheckCircle2, XCircle, Clock, Plus, Minus, MoreVertical, Trash2, Trophy, Share2 } from 'lucide-react'

interface BetCardProps {
  bet: Bet
  onShare: (bet: Bet) => void
}

export const BetCard: React.FC<BetCardProps> = ({ bet, onShare }) => {
  const { updateCondition, cashoutBet, settleBet, deleteBet, oddsFormat } = useBets()
  const [showMenu, setShowMenu] = useState(false)

  const totalConditions = bet.conditions.length
  const metConditions = bet.conditions.filter(c => c.status === 'MET').length
  const globalProgress = totalConditions > 0 ? Math.round((metConditions / totalConditions) * 100) : 0

  return (
    <div className="bg-[#12141C] border border-white/5 hover:border-white/10 rounded-lg p-4 mb-3 transition-all relative">
      
      {/* Top Header: Teams & Live Status */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          {bet.status === 'LIVE' && (
            <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-red-400 bg-red-950/60 border border-red-500/30 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {bet.match.minute || 'LIVE'}
            </span>
          )}

          {bet.status === 'PENDING' && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
              <Clock className="w-3 h-3" />
              Próximo
            </span>
          )}

          {bet.status === 'WON' && (
            <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
              <CheckCircle2 className="w-3 h-3" />
              GANADA (+${(bet.potentialPayout - bet.stake).toFixed(2)})
            </span>
          )}

          {bet.status === 'LOST' && (
            <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-red-400 bg-red-950/60 border border-red-500/30 px-2 py-0.5 rounded">
              <XCircle className="w-3 h-3" />
              PERDIDA
            </span>
          )}

          {bet.status === 'CASHOUT' && (
            <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
              CASHOUT (${bet.cashoutValue?.toFixed(2)})
            </span>
          )}

          <span className="text-xs text-slate-400 truncate max-w-[140px] sm:max-w-none">
            {bet.league}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-orange-400 font-semibold">
            {bet.bookmaker}
          </span>
        </div>

        {/* Share & More Menu */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onShare(bet)}
            className="p-1 text-slate-400 hover:text-orange-400 rounded hover:bg-white/5 transition-colors"
            title="Exportar tarjeta para redes"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-slate-500 hover:text-white rounded hover:bg-white/5"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-6 z-20 bg-[#1A1D28] border border-white/10 rounded-md shadow-xl py-1 w-36 text-xs text-slate-200">
                {bet.status === 'LIVE' && (
                  <>
                    <button
                      onClick={() => { settleBet(bet.id, 'WON'); setShowMenu(false) }}
                      className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-emerald-400 flex items-center gap-1.5"
                    >
                      <Trophy className="w-3.5 h-3.5" /> Ganada
                    </button>
                    <button
                      onClick={() => { settleBet(bet.id, 'LOST'); setShowMenu(false) }}
                      className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-red-400 flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Perdida
                    </button>
                  </>
                )}
                <button
                  onClick={() => { deleteBet(bet.id); setShowMenu(false) }}
                  className="w-full text-left px-3 py-1.5 hover:bg-red-950/50 text-red-400 flex items-center gap-1.5 border-t border-white/5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

      {/* Match Title & Score */}
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <span>{bet.match.homeTeam}</span>
          {bet.match.homeScore !== undefined && (
            <span className="font-mono text-orange-400 font-extrabold text-sm px-1.5 py-0.2 bg-black/40 rounded">
              {bet.match.homeScore} - {bet.match.awayScore}
            </span>
          )}
          <span className="text-slate-500 font-normal">vs</span>
          <span>{bet.match.awayTeam}</span>
        </h3>
      </div>

      {/* Clean Financial Strip */}
      <div className="bg-[#0B0C10] px-3 py-2 rounded flex items-center justify-between text-xs font-mono mb-3">
        <div>
          <span className="text-slate-500 text-[10px] uppercase block">Stake</span>
          <span className="font-bold text-white">${bet.stake.toFixed(2)}</span>
        </div>
        <div className="text-center">
          <span className="text-slate-500 text-[10px] uppercase block">
            Cuota ({oddsFormat === 'decimal' ? 'DEC' : oddsFormat === 'american' ? 'AME' : 'FRA'})
          </span>
          <span className="font-bold text-orange-400">{formatOdds(bet.odds, oddsFormat)}</span>
        </div>
        <div className="text-right">
          <span className="text-slate-500 text-[10px] uppercase block">Retorno</span>
          <span className="font-bold text-emerald-400">${bet.potentialPayout.toFixed(2)}</span>
        </div>
      </div>

      {/* Conditions Checklist (Simple & Visual) */}
      <div className="space-y-2 mb-3">
        {bet.conditions.map((cond: BetCondition) => {
          const isMet = cond.status === 'MET'

          return (
            <div
              key={cond.id}
              className={`p-2.5 rounded text-xs transition-colors flex items-center justify-between gap-2 ${
                isMet
                  ? 'bg-emerald-950/30 border border-emerald-500/20'
                  : 'bg-[#181B26]/60 border border-white/5'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isMet ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" />
                )}
                <span className={`truncate font-medium ${isMet ? 'text-emerald-200' : 'text-slate-200'}`}>
                  {cond.selection}
                </span>
              </div>

              {/* Progress Count & Tap Adjusters */}
              <div className="flex items-center gap-2 shrink-0 font-mono">
                <span className={`text-[11px] font-bold ${isMet ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {typeof cond.currentValue === 'number' && typeof cond.targetValue === 'number'
                    ? `${cond.currentValue}/${cond.targetValue}`
                    : cond.currentValue}
                </span>

                {typeof cond.currentValue === 'number' && bet.status === 'LIVE' && !isMet && (
                  <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded">
                    <button
                      onClick={() => updateCondition(bet.id, cond.id, -1)}
                      className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => updateCondition(bet.id, cond.id, 1)}
                      className="w-5 h-5 flex items-center justify-center bg-[#FF5500] text-white rounded font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress Bar & Cashout footer */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-20 bg-[#0B0C10] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {metConditions}/{totalConditions}
          </span>
        </div>

        {bet.status === 'LIVE' && bet.cashoutValue && (
          <button
            onClick={() => cashoutBet(bet.id)}
            className="bg-[#FF5500] hover:bg-[#FF661A] text-white font-mono font-bold text-xs px-3 py-1 rounded shadow active:scale-95 transition-all"
          >
            Cashout ${bet.cashoutValue.toFixed(2)}
          </button>
        )}
      </div>

    </div>
  )
}
