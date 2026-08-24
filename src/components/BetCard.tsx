import { useState, useRef, memo } from 'react';
import type { Bet, BetCondition } from '../types/bet';
import { formatConditionValue } from '../types/bet';
import { useBets } from '../context/BetContext';
import { useClickOutside } from '../hooks/useClickOutside';
import { formatOdds, ODDS_FORMAT_SHORT } from '../utils/odds';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Minus,
  MoreVertical,
  Trash2,
  Trophy,
  Share2,
  ChevronDown,
  ChevronUp,
  Flame,
  Play,
  RotateCcw,
} from 'lucide-react';

interface BetCardProps {
  bet: Bet;
  onShare: (bet: Bet) => void;
}

function BetCardComponent({ bet, onShare }: BetCardProps) {
  const {
    updateCondition,
    cashoutBet,
    settleBet,
    setBetStatus,
    deleteBet,
    oddsFormat,
    currencySymbol,
  } = useBets();
  const [showMenu, setShowMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setShowMenu(false), showMenu);

  const totalConditions = bet.conditions.length;
  const metConditions = bet.conditions.filter((c) => c.status === 'MET').length;
  const pendingConditions = totalConditions - metConditions;
  const globalProgress =
    totalConditions > 0
      ? Math.round((metConditions / totalConditions) * 100)
      : 0;

  // "A 1 DEL COBRO" / MATCH POINT ALERT
  const isMatchPoint =
    bet.status === 'LIVE' && totalConditions >= 2 && pendingConditions === 1;

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <div
      className={`bg-surface rounded-lg p-3.5 sm:p-4 lg:p-5 mb-3 transition-all relative ${
        isMatchPoint
          ? 'border-2 border-orange-500 shadow-lg shadow-orange-950/60 ring-1 ring-orange-500/40'
          : 'border border-white/10 hover:border-white/20'
      }`}
    >
      {/* Top Header: Teams, Live Status & Match Point Badge */}
      <div className='flex items-center justify-between gap-2 mb-2.5'>
        <div className='flex items-center gap-1.5 flex-wrap'>
          {bet.status === 'LIVE' && (
            <span className='flex items-center gap-1 text-[11px] font-mono font-bold text-red-400 bg-red-950/60 border border-red-500/40 px-2 py-0.5 rounded'>
              <span className='w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse' />
              {bet.match.minute || 'LIVE'}
            </span>
          )}

          {/* 🔥 "A 1 DEL COBRO" (MATCH POINT) BADGE */}
          {isMatchPoint && (
            <span className='flex items-center gap-1 text-[11px] font-mono font-black text-amber-300 bg-gradient-to-r from-amber-950/90 to-orange-950/90 border border-amber-500/60 px-2 py-0.5 rounded shadow-sm animate-pulse'>
              <Flame className='w-3 h-3 text-orange-400 fill-orange-400' />
              ¡A 1 DEL COBRO!
            </span>
          )}

          {bet.status === 'PENDING' && (
            <span className='flex items-center gap-1 text-[11px] font-mono text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded'>
              <Clock className='w-3 h-3 text-slate-400' />
              Próximo
            </span>
          )}

          {bet.status === 'WON' && (
            <span className='flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded'>
              <CheckCircle2 className='w-3.5 h-3.5' />
              GANADA (+{currencySymbol}
              {(bet.potentialPayout - bet.stake).toFixed(2)})
            </span>
          )}

          {bet.status === 'LOST' && (
            <span className='flex items-center gap-1 text-[11px] font-mono font-bold text-red-400 bg-red-950/60 border border-red-500/30 px-2 py-0.5 rounded'>
              <XCircle className='w-3.5 h-3.5' />
              PERDIDA
            </span>
          )}

          {bet.status === 'CASHOUT' && (
            <span className='text-[11px] font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded'>
              CASHOUT ({currencySymbol}
              {bet.cashoutValue?.toFixed(2)})
            </span>
          )}

          <span className='text-xs text-slate-300 truncate max-w-[130px] sm:max-w-none'>
            {bet.league}
          </span>
          <span className='text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-orange-400 font-bold'>
            {bet.bookmaker}
          </span>
        </div>

        {/* Header Right: Share, Collapse & More Actions */}
        <div className='flex items-center gap-1 shrink-0'>
          <button
            onClick={() => onShare(bet)}
            aria-label='Exportar tarjeta visual para redes'
            className='p-1.5 text-slate-300 hover:text-brand rounded bg-white/5 hover:bg-white/10 transition-colors'
          >
            <Share2 className='w-3.5 h-3.5' />
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            onClick={toggleCollapse}
            aria-expanded={!isCollapsed}
            aria-label={
              isCollapsed ? 'Expandir condiciones' : 'Plegar condiciones'
            }
            className='p-1.5 text-slate-300 hover:text-white rounded bg-white/5 hover:bg-white/10 transition-colors'
          >
            {isCollapsed ? (
              <ChevronDown className='w-3.5 h-3.5' />
            ) : (
              <ChevronUp className='w-3.5 h-3.5' />
            )}
          </button>

          {/* More Menu Dropdown */}
          <div className='relative' ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label='Más acciones'
              aria-expanded={showMenu}
              className='p-1.5 text-slate-400 hover:text-white rounded bg-white/5 hover:bg-white/10'
            >
              <MoreVertical className='w-3.5 h-3.5' />
            </button>

            {showMenu && (
              <div className='absolute right-0 top-7 z-20 bg-elevated border border-white/15 rounded-md shadow-2xl py-1 w-44 text-xs text-slate-200'>
                {bet.status === 'PENDING' && (
                  <button
                    onClick={() => {
                      setBetStatus(bet.id, 'LIVE');
                      setShowMenu(false);
                    }}
                    className='w-full text-left px-3 py-1.5 hover:bg-white/10 text-brand flex items-center gap-1.5 font-semibold'
                  >
                    <Play className='w-3.5 h-3.5' /> Iniciar En Vivo
                  </button>
                )}

                {bet.status === 'LIVE' && (
                  <>
                    <button
                      onClick={() => {
                        settleBet(bet.id, 'WON');
                        setShowMenu(false);
                      }}
                      className='w-full text-left px-3 py-1.5 hover:bg-white/10 text-emerald-400 flex items-center gap-1.5 font-semibold'
                    >
                      <Trophy className='w-3.5 h-3.5' /> Ganada
                    </button>
                    <button
                      onClick={() => {
                        settleBet(bet.id, 'LOST');
                        setShowMenu(false);
                      }}
                      className='w-full text-left px-3 py-1.5 hover:bg-white/10 text-red-400 flex items-center gap-1.5 font-semibold'
                    >
                      <XCircle className='w-3.5 h-3.5' /> Perdida
                    </button>
                    <button
                      onClick={() => {
                        setBetStatus(bet.id, 'PENDING');
                        setShowMenu(false);
                      }}
                      className='w-full text-left px-3 py-1.5 hover:bg-white/10 text-slate-300 flex items-center gap-1.5'
                    >
                      <Clock className='w-3.5 h-3.5' /> Pausar (Pre-Match)
                    </button>
                  </>
                )}

                {(bet.status === 'WON' ||
                  bet.status === 'LOST' ||
                  bet.status === 'CASHOUT') && (
                  <button
                    onClick={() => {
                      setBetStatus(bet.id, 'LIVE');
                      setShowMenu(false);
                    }}
                    className='w-full text-left px-3 py-1.5 hover:bg-white/10 text-cyan-400 flex items-center gap-1.5 font-semibold'
                  >
                    <RotateCcw className='w-3.5 h-3.5' /> Reactivar a En Vivo
                  </button>
                )}

                <button
                  onClick={() => {
                    deleteBet(bet.id);
                    setShowMenu(false);
                  }}
                  className='w-full text-left px-3 py-1.5 hover:bg-red-950/50 text-red-400 flex items-center gap-1.5 border-t border-white/10 font-semibold'
                >
                  <Trash2 className='w-3.5 h-3.5' /> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Match Title & Score - clickable collapse toggle */}
      <button
        type='button'
        onClick={toggleCollapse}
        aria-expanded={!isCollapsed}
        className='w-full flex items-baseline justify-between mb-2.5 cursor-pointer select-none text-left'
      >
        <h3 className='text-base lg:text-lg font-bold text-white tracking-tight flex items-center gap-2'>
          <span>{bet.match.homeTeam}</span>
          {bet.match.homeScore !== undefined && (
            <span className='font-mono text-orange-400 font-extrabold text-xs px-1.5 py-0.5 bg-black/60 border border-orange-500/30 rounded'>
              {bet.match.homeScore} - {bet.match.awayScore}
            </span>
          )}
          <span className='text-slate-400 font-normal text-xs'>vs</span>
          <span>{bet.match.awayTeam}</span>
        </h3>
      </button>

      {/* Clean Financial Strip */}
      <div className='bg-[#08090D] px-3 py-2 rounded-lg border border-white/5 flex items-center justify-between text-xs lg:text-sm font-mono mb-2.5'>
        <div>
          <span className='text-slate-400 text-[10px] uppercase font-bold block'>
            Stake
          </span>
          <span className='font-bold text-white text-xs'>
            {currencySymbol}
            {bet.stake.toFixed(2)}
          </span>
        </div>
        <div className='text-center'>
          <span className='text-slate-400 text-[10px] uppercase font-bold block'>
            Cuota ({ODDS_FORMAT_SHORT[oddsFormat]})
          </span>
          <span className='font-black text-orange-400 text-xs'>
            {formatOdds(bet.odds, oddsFormat)}
          </span>
        </div>
        <div className='text-right'>
          <span className='text-slate-400 text-[10px] uppercase font-bold block'>
            Retorno
          </span>
          <span className='font-black text-emerald-400 text-xs'>
            {currencySymbol}
            {bet.potentialPayout.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Conditions Checklist (Collapsed vs Full View) */}
      {!isCollapsed ? (
        <ul className='space-y-2 mb-3'>
          {bet.conditions.map((cond: BetCondition) => {
            const isMet = cond.status === 'MET';
            const isBusted = cond.status === 'BUSTED';
            const isClutch = cond.status === 'CLUTCH_DANGER';

            return (
              <li
                key={cond.id}
                title={cond.dangerNote}
                className={`p-2.5 rounded-lg text-xs lg:text-sm transition-colors flex items-center justify-between gap-2 border ${
                  isMet
                    ? 'bg-emerald-950/30 border-emerald-500/30'
                    : isBusted
                      ? 'bg-red-950/30 border-red-500/30'
                      : isClutch
                        ? 'bg-amber-950/30 border-amber-500/40'
                        : 'bg-panel border-white/10'
                }`}
              >
                <div className='flex items-center gap-2 min-w-0'>
                  {isMet ? (
                    <CheckCircle2 className='w-4 h-4 text-emerald-400 shrink-0' />
                  ) : isBusted ? (
                    <XCircle className='w-4 h-4 text-red-400 shrink-0' />
                  ) : isClutch ? (
                    <Flame className='w-4 h-4 text-amber-400 fill-amber-400 shrink-0 animate-pulse' />
                  ) : (
                    <div className='w-4 h-4 rounded-full border-2 border-slate-500 shrink-0' />
                  )}
                  <span
                    className={`truncate font-semibold ${
                      isMet
                        ? 'text-emerald-200'
                        : isBusted
                          ? 'text-red-200 line-through'
                          : isClutch
                            ? 'text-amber-200'
                            : 'text-slate-100'
                    }`}
                  >
                    {cond.selection}
                  </span>
                </div>

                {/* Progress Count & Fat-Finger Friendly Touch Controls */}
                <div className='flex items-center gap-2 shrink-0 font-mono'>
                  <span
                    className={`text-xs lg:text-sm font-black ${isMet ? 'text-emerald-400' : isBusted ? 'text-red-400' : isClutch ? 'text-amber-400' : 'text-brand'}`}
                  >
                    {formatConditionValue(cond)}
                  </span>

                  {/* Big Touch Targets for Mobile + / - */}
                  {typeof cond.currentValue === 'number' &&
                    bet.status === 'LIVE' &&
                    !isMet &&
                    !isBusted && (
                      <div className='flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-white/10'>
                        <button
                          onClick={() => updateCondition(bet.id, cond.id, -1)}
                          aria-label={`Restar 1 a ${cond.selection}`}
                          className='w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-[0.85] text-slate-200 rounded-md transition-transform'
                        >
                          <Minus className='w-3.5 h-3.5' />
                        </button>
                        <button
                          onClick={() => updateCondition(bet.id, cond.id, 1)}
                          aria-label={`Sumar 1 a ${cond.selection}`}
                          className='w-7 h-7 flex items-center justify-center bg-brand hover:bg-brand-hover active:scale-[0.85] text-white rounded-md font-bold shadow-md transition-transform'
                        >
                          <Plus className='w-3.5 h-3.5' />
                        </button>
                      </div>
                    )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        /* Slim Collapsed Summary */
        <div className='mb-2 px-2 py-1.5 bg-white/5 rounded text-[11px] font-mono text-slate-300 flex items-center justify-between'>
          <span className='truncate'>
            {bet.conditions
              .map((c) =>
                c.status === 'MET'
                  ? '✅'
                  : c.status === 'BUSTED'
                    ? '❌'
                    : c.status === 'CLUTCH_DANGER'
                      ? '🔥'
                      : '⏳',
              )
              .join(' ')}{' '}
            {' • '}
            {bet.conditions.map((c) => c.selection).join(' • ')}
          </span>
          <span className='text-brand font-bold ml-2 shrink-0'>
            {metConditions}/{totalConditions}
          </span>
        </div>
      )}

      {/* Progress Bar & Cashout footer */}
      <div className='flex items-center justify-between gap-3 pt-2 border-t border-white/10'>
        <div className='flex items-center gap-2 flex-1'>
          <div className='w-24 bg-[#08090D] h-2 rounded-full overflow-hidden border border-white/5'>
            <div
              role='progressbar'
              aria-valuenow={globalProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label='Progreso de condiciones'
              className={`h-full rounded-full transition-all duration-300 ${
                isMatchPoint
                  ? 'bg-gradient-to-r from-orange-500 to-amber-400'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${globalProgress}%` }}
            />
          </div>
          <span className='text-[11px] font-mono font-bold text-slate-300'>
            {metConditions}/{totalConditions}{' '}
            {globalProgress === 100 ? '✔' : ''}
          </span>
        </div>

        {bet.status === 'LIVE' && bet.cashoutValue && (
          <button
            onClick={() => cashoutBet(bet.id)}
            className='bg-brand hover:bg-brand-hover text-white font-mono font-black text-xs px-3.5 py-1.5 rounded-lg shadow-md shadow-orange-950/60 active:scale-95 transition-all'
          >
            Cashout {currencySymbol}
            {bet.cashoutValue.toFixed(2)}
          </button>
        )}
      </div>
    </div>
  );
}

export const BetCard = memo(BetCardComponent);
