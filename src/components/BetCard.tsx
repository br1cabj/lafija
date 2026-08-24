import { useState, useRef, memo } from 'react';
import type { Bet, BetCondition } from '../types/bet';
import { effectiveOdds, formatConditionValue } from '../types/bet';
import { useBets } from '../context/BetContext';
import { useClickOutside } from '../hooks/useClickOutside';
import { formatOdds, ODDS_FORMAT_SHORT } from '../utils/odds';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import {
  Ban,
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
  Repeat,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

interface BetCardProps {
  bet: Bet;
  onShare: (bet: Bet) => void;
  /** true mientras se genera el PNG para el share nativo (muestra spinner). */
  isSharing?: boolean;
}

function BetCardComponent({ bet, onShare, isSharing = false }: BetCardProps) {
  const {
    updateCondition,
    cashoutBet,
    settleBet,
    setBetStatus,
    deleteBet,
    voidConditions,
    swapPlayer,
    oddsFormat,
    currencySymbol,
    isRealMode,
  } = useBets();
  const [showMenu, setShowMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [swapConditionId, setSwapConditionId] = useState<string | null>(null);
  const [swapText, setSwapText] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setShowMenu(false), showMenu);

  // Las condiciones anuladas no cuentan para el progreso (aportan cuota 1.0)
  const activeConditions = bet.conditions.filter((c) => c.status !== 'VOID');
  const totalConditions = activeConditions.length;
  const metConditions = activeConditions.filter(
    (c) => c.status === 'MET',
  ).length;
  const pendingConditions = totalConditions - metConditions;
  const globalProgress =
    totalConditions > 0
      ? Math.round((metConditions / totalConditions) * 100)
      : 0;
  const hasVoidedConditions = bet.conditions.some((c) => c.status === 'VOID');
  const effOdds = hasVoidedConditions ? effectiveOdds(bet) : bet.odds;
  const effPayout = bet.stake * effOdds;

  // Alerta de match point: falta una sola condición para el cobro
  const isMatchPoint =
    bet.status === 'LIVE' && totalConditions >= 2 && pendingConditions === 1;

  // Partido suspendido/aplazado con apuesta en juego: sugerir anulación
  const isSuspended = bet.match.status === 'POSTPONED' && bet.status === 'LIVE';

  const swapCondition = bet.conditions.find((c) => c.id === swapConditionId);

  const openSwapDialog = (cond: BetCondition) => {
    setSwapConditionId(cond.id);
    setSwapText(cond.selection);
  };

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <div
      className={`relative mb-3 rounded-lg border bg-surface p-4 transition-colors duration-150 lg:p-5 ${
        isMatchPoint
          ? 'border-white/10 border-l-2 border-l-brand'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Meta row: estado, liga y bookmaker */}
      <div className='mb-3 flex items-center justify-between gap-2'>
        <div className='flex flex-wrap items-center gap-1.5'>
          {bet.status === 'LIVE' && (
            <Badge variant='live' dot pulse>
              {bet.match.minute || 'En vivo'}
            </Badge>
          )}

          {isMatchPoint && (
            <Badge variant='clutch'>
              <Flame className='h-3 w-3 fill-current' />A 1 del cobro
            </Badge>
          )}

          {bet.status === 'PENDING' && (
            <Badge variant='pending'>
              <Clock className='h-3 w-3' />
              Próxima
            </Badge>
          )}

          {bet.status === 'WON' && (
            <Badge variant='won'>
              <CheckCircle2 className='h-3 w-3' />
              Ganada +{currencySymbol}
              {(bet.potentialPayout - bet.stake).toFixed(2)}
            </Badge>
          )}

          {bet.status === 'LOST' && (
            <Badge variant='lost'>
              <XCircle className='h-3 w-3' />
              Perdida
            </Badge>
          )}

          {bet.status === 'CASHOUT' && (
            <Badge variant='cashout'>
              Retirada ({currencySymbol}
              {bet.cashoutValue?.toFixed(2)})
            </Badge>
          )}

          {bet.status === 'VOID' && (
            <Badge variant='neutral'>
              <Ban className='h-3 w-3' />
              Anulada · stake devuelto
            </Badge>
          )}

          <span className='truncate text-xs text-slate-400'>{bet.league}</span>
          <Badge variant='neutral' className='!px-1.5 !text-[10px]'>
            {bet.bookmaker}
          </Badge>
        </div>

        {/* Acciones: compartir, plegar, menú */}
        <div className='flex shrink-0 items-center gap-1'>
          <button
            onClick={() => onShare(bet)}
            disabled={isSharing}
            aria-label='Exportar tarjeta visual para redes'
            className='rounded-md p-1.5 text-slate-400 transition-colors duration-150 hover:bg-white/5 hover:text-white disabled:opacity-50'
          >
            {isSharing ? (
              <span className='block h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent' />
            ) : (
              <Share2 className='h-4 w-4' />
            )}
          </button>

          <button
            onClick={toggleCollapse}
            aria-expanded={!isCollapsed}
            aria-label={
              isCollapsed ? 'Expandir condiciones' : 'Plegar condiciones'
            }
            className='rounded-md p-1.5 text-slate-400 transition-colors duration-150 hover:bg-white/5 hover:text-white'
          >
            {isCollapsed ? (
              <ChevronDown className='h-4 w-4' />
            ) : (
              <ChevronUp className='h-4 w-4' />
            )}
          </button>

          <div className='relative' ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label='Más acciones'
              aria-expanded={showMenu}
              className='rounded-md p-1.5 text-slate-400 transition-colors duration-150 hover:bg-white/5 hover:text-white'
            >
              <MoreVertical className='h-4 w-4' />
            </button>

            {showMenu && (
              <div className='absolute right-0 top-9 z-20 w-44 rounded-lg border border-white/15 bg-elevated py-1 text-xs shadow-2xl'>
                {bet.status === 'PENDING' && (
                  <button
                    onClick={() => {
                      setBetStatus(bet.id, 'LIVE');
                      setShowMenu(false);
                    }}
                    className='flex w-full items-center gap-2 px-3 py-2 text-left text-slate-200 transition-colors hover:bg-white/5'
                  >
                    <Play className='h-3.5 w-3.5 text-red-400' /> Pasar a en
                    vivo
                  </button>
                )}

                {bet.status === 'LIVE' && (
                  <>
                    <button
                      onClick={() => {
                        settleBet(bet.id, 'WON');
                        setShowMenu(false);
                      }}
                      className='flex w-full items-center gap-2 px-3 py-2 text-left text-slate-200 transition-colors hover:bg-white/5'
                    >
                      <Trophy className='h-3.5 w-3.5 text-emerald-400' /> Marcar
                      ganada
                    </button>
                    <button
                      onClick={() => {
                        settleBet(bet.id, 'LOST');
                        setShowMenu(false);
                      }}
                      className='flex w-full items-center gap-2 px-3 py-2 text-left text-slate-200 transition-colors hover:bg-white/5'
                    >
                      <XCircle className='h-3.5 w-3.5 text-red-400' /> Marcar
                      perdida
                    </button>
                    <button
                      onClick={() => {
                        setShowSuspendDialog(true);
                        setShowMenu(false);
                      }}
                      className='flex w-full items-center gap-2 px-3 py-2 text-left text-slate-200 transition-colors hover:bg-white/5'
                    >
                      <ShieldAlert className='h-3.5 w-3.5 text-amber-400' />{' '}
                      Suspensión del partido…
                    </button>
                    <button
                      onClick={() => {
                        setBetStatus(bet.id, 'PENDING');
                        setShowMenu(false);
                      }}
                      className='flex w-full items-center gap-2 px-3 py-2 text-left text-slate-200 transition-colors hover:bg-white/5'
                    >
                      <Clock className='h-3.5 w-3.5 text-slate-400' /> Pausar
                      (pre-partido)
                    </button>
                  </>
                )}

                {bet.status === 'PENDING' && (
                  <button
                    onClick={() => {
                      settleBet(bet.id, 'VOID');
                      setShowMenu(false);
                    }}
                    className='flex w-full items-center gap-2 px-3 py-2 text-left text-slate-200 transition-colors hover:bg-white/5'
                  >
                    <Ban className='h-3.5 w-3.5 text-slate-400' /> Anular
                    (suspendido / cancelado)
                  </button>
                )}

                {(bet.status === 'WON' ||
                  bet.status === 'LOST' ||
                  bet.status === 'CASHOUT') && (
                  <button
                    onClick={() => {
                      setBetStatus(bet.id, 'LIVE');
                      setShowMenu(false);
                    }}
                    className='flex w-full items-center gap-2 px-3 py-2 text-left text-slate-200 transition-colors hover:bg-white/5'
                  >
                    <RotateCcw className='h-3.5 w-3.5 text-cyan-400' />{' '}
                    Reactivar a en vivo
                  </button>
                )}

                <button
                  onClick={() => {
                    deleteBet(bet.id);
                    setShowMenu(false);
                  }}
                  className='flex w-full items-center gap-2 border-t border-white/10 px-3 py-2 text-left text-red-400 transition-colors hover:bg-red-950/40'
                >
                  <Trash2 className='h-3.5 w-3.5' /> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Título del partido */}
      <button
        type='button'
        onClick={toggleCollapse}
        aria-expanded={!isCollapsed}
        className='mb-3 flex w-full cursor-pointer select-none items-baseline justify-between gap-2 text-left'
      >
        <h3 className='flex items-center gap-2 text-base font-semibold tracking-tight text-white lg:text-lg'>
          <span>{bet.match.homeTeam}</span>
          {bet.match.homeScore !== undefined && (
            <span className='font-mono-numbers rounded-sm border border-white/10 bg-base px-1.5 py-0.5 text-xs font-bold text-orange-400'>
              {bet.match.homeScore} - {bet.match.awayScore}
            </span>
          )}
          <span className='text-xs font-normal text-slate-500'>vs</span>
          <span>{bet.match.awayTeam}</span>
        </h3>
      </button>

      {/* Banner de suspensión detectada por datos reales */}
      {isSuspended && !hasVoidedConditions && (
        <div className='mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2'>
          <span className='flex items-center gap-2 text-xs font-medium text-amber-300'>
            <ShieldAlert className='h-4 w-4 shrink-0' />
            Partido suspendido — podés anular o esperar reanudación (24-48hs)
          </span>
          <Button
            size='sm'
            variant='secondary'
            onClick={() => setShowSuspendDialog(true)}
          >
            Anular…
          </Button>
        </div>
      )}

      {/* Aviso: el live sync no encontró este partido en la API */}
      {bet.status === 'LIVE' &&
        isRealMode &&
        bet.match.linked === false &&
        !isSuspended && (
          <div className='mb-3 flex items-center gap-2 rounded-md border border-white/10 bg-panel px-3 py-2 text-xs text-slate-400'>
            <ShieldAlert className='h-3.5 w-3.5 shrink-0 text-slate-500' />
            Seguimiento manual — no se encontró el partido en la API. Los
            valores no se actualizan solos.
          </div>
        )}

      {/* Strip financiero */}
      <div className='font-mono-numbers mb-3 flex items-center justify-between rounded-md border border-white/5 bg-base px-3 py-2 text-sm'>
        <div>
          <span className='block text-[10px] font-medium tracking-wide text-slate-500 uppercase'>
            Stake
          </span>
          <span className='text-xs font-bold text-white'>
            {currencySymbol}
            {bet.stake.toFixed(2)}
          </span>
        </div>
        <div className='text-center'>
          <span className='block text-[10px] font-medium tracking-wide text-slate-500 uppercase'>
            Cuota ({ODDS_FORMAT_SHORT[oddsFormat]})
          </span>
          <span className='text-xs font-bold text-orange-400'>
            {formatOdds(effOdds, oddsFormat)}
            {hasVoidedConditions && (
              <span className='ml-1 font-normal text-slate-500 line-through'>
                {formatOdds(bet.odds, oddsFormat)}
              </span>
            )}
          </span>
        </div>
        <div className='text-right'>
          <span className='block text-[10px] font-medium tracking-wide text-slate-500 uppercase'>
            Retorno
          </span>
          <span className='text-xs font-bold text-emerald-400'>
            {currencySymbol}
            {effPayout.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Condiciones */}
      {!isCollapsed ? (
        <ul className='mb-3 space-y-2'>
          {bet.conditions.map((cond: BetCondition) => {
            const isMet = cond.status === 'MET';
            const isBusted = cond.status === 'BUSTED';
            const isClutch = cond.status === 'CLUTCH_DANGER';
            const isVoid = cond.status === 'VOID';

            return (
              <li
                key={cond.id}
                title={
                  cond.supersubFrom
                    ? `Super Sub — heredó de: ${cond.supersubFrom}`
                    : cond.dangerNote
                }
                className={`flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm transition-colors ${
                  isVoid
                    ? 'border-white/5 bg-black/20 opacity-60'
                    : isMet
                      ? 'border-emerald-500/25 bg-emerald-500/5'
                      : isBusted
                        ? 'border-red-500/25 bg-red-500/5'
                        : isClutch
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-white/10 bg-panel'
                }`}
              >
                <div className='flex min-w-0 items-center gap-2.5'>
                  {isVoid ? (
                    <Ban className='h-4 w-4 shrink-0 text-slate-500' />
                  ) : isMet ? (
                    <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-400' />
                  ) : isBusted ? (
                    <XCircle className='h-4 w-4 shrink-0 text-red-400' />
                  ) : isClutch ? (
                    <Flame className='h-4 w-4 shrink-0 fill-current text-amber-400' />
                  ) : (
                    <Clock className='h-4 w-4 shrink-0 text-slate-500' />
                  )}
                  <div className='min-w-0'>
                    {cond.market && (
                      <span
                        className='block truncate text-[9px] font-semibold tracking-wider text-slate-500 uppercase'
                        title={cond.market}
                      >
                        {cond.market}
                      </span>
                    )}
                    <span
                      className={`block truncate font-medium ${
                        isVoid
                          ? 'text-slate-500 line-through'
                          : isMet
                            ? 'text-emerald-300'
                            : isBusted
                              ? 'text-red-300 line-through decoration-red-400/50'
                              : isClutch
                                ? 'text-amber-300'
                                : cond.supersubFrom
                                  ? 'font-semibold text-cyan-300'
                                  : 'text-slate-200'
                      }`}
                    >
                      {cond.selection}
                    </span>
                    {cond.supersubFrom && (
                      <span className='flex items-center gap-1.5 text-[10px]'>
                        <span className='truncate text-slate-500 line-through decoration-slate-600'>
                          {cond.supersubFrom}
                        </span>
                        <Repeat className='h-2.5 w-2.5 shrink-0 text-cyan-400' />
                        <span
                          title={`Super Sub — heredó de: ${cond.supersubFrom}`}
                          className='shrink-0 rounded-sm border border-cyan-400/40 bg-cyan-400/10 px-1 font-bold tracking-wide text-cyan-300'
                        >
                          SUPER SUB
                        </span>
                      </span>
                    )}
                  </div>
                  {cond.superSub && !isVoid && !cond.supersubFrom && (
                    <span
                      title='Super Sub: la línea hereda al suplente'
                      className='shrink-0 rounded-sm border border-cyan-400/40 bg-cyan-400/10 px-1 py-0.5 text-[9px] font-bold text-cyan-300'
                    >
                      SS
                    </span>
                  )}
                </div>

                {/* Valor actual y controles +/- */}
                <div className='font-mono-numbers flex shrink-0 items-center gap-2'>
                  {!isVoid && (
                    <span
                      className={`text-sm font-bold ${isMet ? 'text-emerald-400' : isBusted ? 'text-red-400' : isClutch ? 'text-amber-400' : 'text-brand'}`}
                    >
                      {formatConditionValue(cond)}
                    </span>
                  )}
                  {isVoid && (
                    <span className='text-[10px] font-semibold tracking-wide text-slate-500 uppercase'>
                      Cuota 1.0
                    </span>
                  )}

                  {/* Super Sub: cambiar jugador durante el partido */}
                  {cond.superSub &&
                    bet.status === 'LIVE' &&
                    !isVoid &&
                    !isMet &&
                    !isBusted && (
                      <button
                        onClick={() => openSwapDialog(cond)}
                        aria-label={`Super Sub: cambiar jugador en ${cond.selection}`}
                        title='Super Sub: el suplente que entró hereda esta línea'
                        className='flex h-7 w-7 items-center justify-center rounded-sm border border-white/10 text-slate-400 transition-colors duration-150 hover:border-brand/50 hover:text-brand'
                      >
                        <Repeat className='h-3.5 w-3.5' />
                      </button>
                    )}

                  {typeof cond.currentValue === 'number' &&
                    bet.status === 'LIVE' &&
                    !isVoid &&
                    !isMet &&
                    !isBusted && (
                      <div className='flex items-center gap-1 rounded-md border border-white/10 bg-black/40 p-0.5'>
                        <button
                          onClick={() => updateCondition(bet.id, cond.id, -1)}
                          aria-label={`Restar 1 a ${cond.selection}`}
                          className='flex h-7 w-7 items-center justify-center rounded-sm text-slate-300 transition-colors duration-150 hover:bg-white/10 hover:text-white'
                        >
                          <Minus className='h-3.5 w-3.5' />
                        </button>
                        <button
                          onClick={() => updateCondition(bet.id, cond.id, 1)}
                          aria-label={`Sumar 1 a ${cond.selection}`}
                          className='flex h-7 w-7 items-center justify-center rounded-sm bg-brand text-white transition-colors duration-150 hover:bg-brand-hover'
                        >
                          <Plus className='h-3.5 w-3.5' />
                        </button>
                      </div>
                    )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        /* Resumen plegado */
        <div className='mb-2 flex items-center justify-between gap-2 rounded-md border border-white/5 bg-panel px-2.5 py-1.5 text-xs text-slate-300'>
          <span className='flex min-w-0 items-center gap-1.5 truncate'>
            {bet.conditions.map((c) => {
              const Icon =
                c.status === 'MET'
                  ? CheckCircle2
                  : c.status === 'BUSTED'
                    ? XCircle
                    : c.status === 'CLUTCH_DANGER'
                      ? Flame
                      : c.status === 'VOID'
                        ? Ban
                        : Clock;
              return (
                <Icon
                  key={c.id}
                  className={`h-3.5 w-3.5 shrink-0 ${
                    c.status === 'MET'
                      ? 'text-emerald-400'
                      : c.status === 'BUSTED'
                        ? 'text-red-400'
                        : c.status === 'CLUTCH_DANGER'
                          ? 'fill-current text-amber-400'
                          : c.status === 'VOID'
                            ? 'text-slate-600'
                            : 'text-slate-500'
                  }`}
                />
              );
            })}
            <span className='ml-1 truncate'>
              {bet.conditions.map((c) => c.selection).join(' · ')}
            </span>
          </span>
          <span className='font-mono-numbers shrink-0 font-semibold text-slate-400'>
            {metConditions}/{totalConditions}
          </span>
        </div>
      )}

      {/* Footer: progreso y cashout */}
      <div className='flex items-center justify-between gap-3 border-t border-white/10 pt-3'>
        <div className='flex flex-1 items-center gap-2.5'>
          <div
            role='progressbar'
            aria-valuenow={globalProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label='Progreso de condiciones'
            className='h-1.5 w-full max-w-32 overflow-hidden rounded-full bg-black/50'
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isMatchPoint ? 'bg-brand' : 'bg-emerald-500'
              }`}
              style={{ width: `${globalProgress}%` }}
            />
          </div>
          <span className='font-mono-numbers text-xs font-semibold text-slate-400'>
            {metConditions}/{totalConditions}
          </span>
        </div>

        {bet.status === 'LIVE' && bet.cashoutValue && (
          <button
            onClick={() => cashoutBet(bet.id)}
            className='font-mono-numbers rounded-md bg-brand px-3.5 py-1.5 text-xs font-bold text-white transition-colors duration-150 hover:bg-brand-hover'
          >
            Retirar {currencySymbol}
            {bet.cashoutValue.toFixed(2)}
          </button>
        )}
      </div>

      {/* Diálogo: suspensión del partido */}
      <SuspendDialog
        isOpen={showSuspendDialog}
        bet={bet}
        onClose={() => setShowSuspendDialog(false)}
        onVoidConditions={(ids) => voidConditions(bet.id, ids)}
        onVoidBet={() => settleBet(bet.id, 'VOID')}
      />

      {/* Diálogo: Super Sub (cambio de jugador) */}
      <Modal
        isOpen={swapConditionId !== null}
        onClose={() => setSwapConditionId(null)}
        ariaLabel='Super Sub: cambio de jugador'
        maxWidthClass='max-w-md'
      >
        <h2 className='mb-1 text-sm font-semibold text-white'>
          Super Sub — cambio de jugador
        </h2>
        <p className='mb-4 text-xs text-slate-400'>
          El suplente que entró hereda la línea con la misma cuota. Editá el
          nombre en la selección.
        </p>
        {swapCondition?.supersubFrom && (
          <p className='mb-3 rounded-md border border-cyan-400/30 bg-cyan-400/5 px-3 py-2 text-xs text-slate-400'>
            Heredó de:{' '}
            <span className='text-slate-500 line-through decoration-slate-600'>
              {swapCondition.supersubFrom}
            </span>{' '}
            <span className='font-semibold text-cyan-300'>➜ suplente</span>
          </p>
        )}
        <label className='mb-1 block text-[11px] font-medium tracking-wide text-slate-400 uppercase'>
          Selección con el suplente
        </label>
        <input
          type='text'
          value={swapText}
          onChange={(e) => setSwapText(e.target.value)}
          autoFocus
          className='w-full rounded-md border border-white/10 bg-base px-3 py-2 text-sm text-white transition-colors focus:border-brand focus:outline-none'
        />
        <div className='mt-5 flex justify-end gap-2 border-t border-white/10 pt-4'>
          <Button variant='ghost' onClick={() => setSwapConditionId(null)}>
            Cancelar
          </Button>
          <Button
            variant='primary'
            disabled={
              !swapText.trim() || swapText.trim() === swapCondition?.selection
            }
            onClick={() => {
              if (swapConditionId && swapText.trim()) {
                swapPlayer(bet.id, swapConditionId, swapText.trim());
              }
              setSwapConditionId(null);
            }}
          >
            Confirmar cambio
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export const BetCard = memo(BetCardComponent);

/** Diálogo de anulación por suspensión: por condición (cuota 1.0) o total. */
const SuspendDialog: React.FC<{
  isOpen: boolean;
  bet: Bet;
  onClose: () => void;
  onVoidConditions: (ids: string[]) => void;
  onVoidBet: () => void;
}> = ({ isOpen, bet, onClose, onVoidConditions, onVoidBet }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const voidable = bet.conditions.filter((c) => c.status !== 'VOID');

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const close = () => {
    setSelected(new Set());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      ariaLabel='Suspensión del partido'
      maxWidthClass='max-w-md'
    >
      <h2 className='mb-1 text-sm font-semibold text-white'>
        Suspensión del partido
      </h2>
      <p className='mb-4 text-xs text-slate-400'>
        Si el partido no se reanuda en 24-48hs (según tu casa), las selecciones
        afectadas se anulan: aportan cuota 1.0 y el resto del ticket sigue
        válido.
      </p>

      <div className='mb-4 space-y-1.5'>
        {voidable.map((cond) => (
          <button
            key={cond.id}
            type='button'
            role='checkbox'
            aria-checked={selected.has(cond.id)}
            onClick={() => toggle(cond.id)}
            className={`flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
              selected.has(cond.id)
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                : 'border-white/10 bg-panel text-slate-300 hover:border-white/25'
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                selected.has(cond.id)
                  ? 'border-amber-400 bg-amber-400 text-black'
                  : 'border-white/25'
              }`}
            >
              {selected.has(cond.id) && <CheckCircle2 className='h-3 w-3' />}
            </span>
            <span className='truncate'>{cond.selection}</span>
          </button>
        ))}
      </div>

      <div className='flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end'>
        <Button variant='ghost' onClick={close}>
          Esperar reanudación
        </Button>
        <Button
          variant='secondary'
          disabled={selected.size === 0}
          onClick={() => {
            onVoidConditions([...selected]);
            close();
          }}
        >
          Anular selección ({selected.size})
        </Button>
        <Button
          variant='danger'
          onClick={() => {
            onVoidBet();
            close();
          }}
        >
          Anular toda la apuesta
        </Button>
      </div>
    </Modal>
  );
};
