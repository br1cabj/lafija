import React from 'react';
import { useBets } from '../context/BetContext';
import { X, TrendingUp, Flame } from 'lucide-react';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { stats, bets, currencySymbol } = useBets();

  if (!isOpen) return null;

  const sportsMap: {
    [key: string]: {
      label: string;
      bets: number;
      settled: number;
      won: number;
      profit: number;
    };
  } = {
    football: {
      label: '⚽ Fútbol (Champions & Ligas)',
      bets: 0,
      settled: 0,
      won: 0,
      profit: 0,
    },
    basketball: {
      label: '🏀 Baloncesto (NBA / Euroliga)',
      bets: 0,
      settled: 0,
      won: 0,
      profit: 0,
    },
    tennis: {
      label: '🎾 Tenis (ATP / WTA)',
      bets: 0,
      settled: 0,
      won: 0,
      profit: 0,
    },
    esports: {
      label: '🎮 Esports (CS2 / LoL)',
      bets: 0,
      settled: 0,
      won: 0,
      profit: 0,
    },
  };

  bets.forEach((b) => {
    const s = sportsMap[b.sport] || sportsMap.football;
    s.bets += 1;
    if (b.status === 'WON') {
      s.won += 1;
      s.settled += 1;
      s.profit += b.potentialPayout - b.stake;
    } else if (b.status === 'LOST') {
      s.settled += 1;
      s.profit -= b.stake;
    } else if (b.status === 'CASHOUT') {
      s.settled += 1;
      s.profit += (b.cashoutValue || b.stake) - b.stake;
    }
  });

  const computedBreakdown = Object.values(sportsMap).filter((s) => s.bets > 0);
  const sportBreakdown =
    computedBreakdown.length > 0
      ? computedBreakdown.map((s) => ({
          sport: s.label,
          bets: s.bets,
          winRate: s.settled > 0 ? Math.round((s.won / s.settled) * 100) : 0,
          profit: Number(s.profit.toFixed(2)),
        }))
      : [
          {
            sport: '⚽ Fútbol (Champions & Ligas)',
            bets: 0,
            winRate: 0,
            profit: 0,
          },
        ];

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto'>
      <div className='faceit-card border border-white/15 w-full max-w-3xl rounded-lg shadow-2xl p-5 md:p-6 my-8 text-slate-200'>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-white/10 pb-4 mb-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded bg-orange-500/20 text-[#FF5500]'>
              <TrendingUp className='w-5 h-5' />
            </div>
            <div>
              <h2 className='text-lg font-bold text-white uppercase tracking-wider font-mono'>
                Estadísticas & Análisis de Rendimiento
              </h2>
              <p className='text-xs text-slate-400'>
                Métricas estilo FACEIT Elo & Control de Bankroll
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Elo Rank Showcase Banner */}
        <div className='bg-gradient-to-r from-[#161822] via-[#241A12] to-[#161822] border border-orange-500/30 rounded p-4 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4'>
          <div className='flex items-center gap-3.5'>
            <div className='w-14 h-14 rounded-lg bg-gradient-to-br from-[#FF5500] to-[#B33600] flex items-center justify-center shadow-lg shadow-orange-950/50 border border-orange-400/40'>
              <span className='text-2xl font-black text-white font-mono-numbers'>
                {stats.faceitLevel}
              </span>
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-bold text-white uppercase tracking-wider font-mono'>
                  RANGO: NIVEL {stats.faceitLevel} PRO TIPSTER
                </span>
                <span className='px-1.5 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono rounded'>
                  TOP 5%
                </span>
              </div>
              <p className='text-xs text-slate-400 font-mono-numbers'>
                Rating actual:{' '}
                <strong className='text-orange-400'>
                  {stats.eloRating} ELO
                </strong>{' '}
                | Próximo rango en: {200 - (stats.eloRating % 200)} pts
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2 font-mono'>
            <div className='px-3 py-1.5 bg-[#0B0C10] rounded border border-white/10 text-center'>
              <span className='text-[10px] text-slate-400 uppercase block'>
                Racha Actual
              </span>
              <span className='text-sm font-bold text-orange-400 flex items-center justify-center gap-1'>
                <Flame className='w-3.5 h-3.5 text-orange-500 fill-orange-500' />
                {stats.winStreak}W
              </span>
            </div>
            <div className='px-3 py-1.5 bg-[#0B0C10] rounded border border-white/10 text-center'>
              <span className='text-[10px] text-slate-400 uppercase block'>
                Win Rate
              </span>
              <span className='text-sm font-bold text-emerald-400'>
                {stats.winRate}%
              </span>
            </div>
          </div>
        </div>

        {/* 4 Stats Grid */}
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 font-mono-numbers'>
          <div className='p-3 bg-[#0B0C10] rounded border border-white/5'>
            <span className='text-[10px] text-slate-500 uppercase block font-sans'>
              Total Apostado
            </span>
            <span className='text-base font-bold text-white'>
              {currencySymbol}
              {stats.totalStaked.toFixed(2)}
            </span>
          </div>
          <div className='p-3 bg-[#0B0C10] rounded border border-white/5'>
            <span className='text-[10px] text-slate-500 uppercase block font-sans'>
              Total Retornado
            </span>
            <span className='text-base font-bold text-emerald-400'>
              {currencySymbol}
              {stats.totalWon.toFixed(2)}
            </span>
          </div>
          <div className='p-3 bg-[#0B0C10] rounded border border-white/5'>
            <span className='text-[10px] text-slate-500 uppercase block font-sans'>
              Yield / ROI
            </span>
            <span className='text-base font-bold text-orange-400'>
              {stats.roi >= 0 ? `+${stats.roi}%` : `${stats.roi}%`}
            </span>
          </div>
          <div className='p-3 bg-[#0B0C10] rounded border border-white/5'>
            <span className='text-[10px] text-slate-500 uppercase block font-sans'>
              Beneficio Neto
            </span>
            <span
              className={`text-base font-bold ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {stats.netProfit >= 0 ? '+' : '-'}
              {currencySymbol}
              {Math.abs(stats.netProfit).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Sport Breakdown Table */}
        <div className='space-y-3'>
          <h3 className='text-xs font-bold text-orange-400 uppercase tracking-wider font-mono'>
            Rendimiento por Deporte & Mercado
          </h3>

          <div className='space-y-2'>
            {sportBreakdown.map((sb, i) => (
              <div
                key={i}
                className='p-3 bg-[#0B0C10] rounded border border-white/5 flex items-center justify-between gap-2 text-xs'
              >
                <div>
                  <span className='font-semibold text-white block'>
                    {sb.sport}
                  </span>
                  <span className='text-slate-400 text-[11px] font-mono-numbers'>
                    {sb.bets} apuestas registradas
                  </span>
                </div>
                <div className='flex items-center gap-4 font-mono-numbers'>
                  <div className='text-right'>
                    <span className='text-slate-400 text-[10px] block'>
                      Win Rate
                    </span>
                    <span className='font-bold text-white'>{sb.winRate}%</span>
                  </div>
                  <div className='text-right'>
                    <span className='text-slate-400 text-[10px] block'>
                      Ganancia
                    </span>
                    <span
                      className={`font-bold ${sb.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {sb.profit >= 0 ? '+' : '-'}
                      {currencySymbol}
                      {Math.abs(sb.profit).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className='flex justify-end pt-5 mt-5 border-t border-white/10'>
          <button
            onClick={onClose}
            className='px-5 py-2 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase transition-colors'
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
