import React from 'react'
import { useBets } from '../context/BetContext'
import { Zap, Target, Bell, Flame } from 'lucide-react'

export const LiveFeedSidebar: React.FC = () => {
  const { liveLogs, isSimulating, bets } = useBets()

  const liveBets = bets.filter(b => b.status === 'LIVE')

  return (
    <div className="space-y-4">
      
      {/* Live Event Stream Card */}
      <div className="faceit-card p-4 rounded">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
              Live Match Ticker
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {isSimulating ? 'TRANSMITIENDO ⚡' : 'STANDBY'}
          </span>
        </div>

        {/* Event Logs List */}
        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {liveLogs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">
              Sin eventos recientes. Activa el simulador para ver actividad en vivo.
            </p>
          ) : (
            liveLogs.map((log) => {
              const isHit = log.type === 'CUMPLIDO'
              const isClutch = log.type === 'CLUTCH'

              return (
                <div
                  key={log.id}
                  className={`p-2.5 rounded text-xs border transition-all ${
                    isHit
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : isClutch
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                      : 'bg-[#0B0C10] border-white/5 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className="text-orange-400 font-bold">{log.matchTitle}</span>
                    <span className="text-slate-400">{log.time}</span>
                  </div>
                  <p className="leading-snug flex items-start gap-1.5">
                    {isHit ? (
                      <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : isClutch ? (
                      <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <span>{log.text}</span>
                  </p>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Quick Summary of Live Conditions in Play */}
      {liveBets.length > 0 && (
        <div className="faceit-card p-4 rounded">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-orange-400" />
              Condiciones Pendientes
            </h4>
            <span className="text-[10px] font-mono text-orange-400 font-bold">
              {liveBets.flatMap(b => b.conditions).filter(c => c.status !== 'MET').length} RESTANTES
            </span>
          </div>

          <div className="space-y-2">
            {liveBets.flatMap(b => b.conditions.filter(c => c.status !== 'MET')).map(cond => (
              <div key={cond.id} className="p-2 bg-[#0B0C10] rounded border border-white/5 text-xs">
                <div className="flex justify-between items-center text-slate-300 font-medium">
                  <span className="truncate max-w-[180px]">{cond.selection}</span>
                  <span className="text-orange-400 font-mono-numbers font-bold text-[11px]">
                    {cond.currentValue}/{cond.targetValue}
                  </span>
                </div>
                <div className="w-full bg-[#161822] h-1 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="bg-[#FF5500] h-full rounded-full"
                    style={{ width: `${cond.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Pro Tips / Anti-Tilt Box */}
      <div className="p-3.5 rounded bg-gradient-to-br from-[#12141C] to-[#181B26] border border-orange-500/20">
        <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase font-mono mb-1">
          <span>🛡️ Bankroll Guard</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Consejo Pro: No arriesgues más del <strong>3% al 5%</strong> de tu bankroll por apuesta simple para mantener un crecimiento sostenido.
        </p>
      </div>

    </div>
  )
}
