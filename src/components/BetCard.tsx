import { useState, useRef, memo } from 'react';
import type { Bet, BetCondition, ExtraMatchInfo } from '../types/bet';
import { effectiveOdds, hasEstimatedLegs } from '../types/bet';
import { useBets } from '../context/BetContext';
import { useClickOutside } from '../hooks/useClickOutside';
import { formatOdds, ODDS_FORMAT_SHORT } from '../utils/odds';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import {
  Ban,
  CheckCircle2,
  XCircle,
  Clock,
  MoreVertical,
  Trash2,
  Trophy,
  Share2,
  ChevronDown,
  ChevronUp,
  Flame,
  Play,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { normalizeName } from '../utils/liveSync';
import { ConditionRow } from './betcard/ConditionRow';
import { SuspendDialog } from './betcard/SuspendDialog';
import { SwapPlayerDialog } from './betcard/SwapPlayerDialog';

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
    setConditionOdds,
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

  // Partidos extra del builder multi-partido: con datos en vivo si el sync
  // ya los actualizó; para boletas viejas, al menos los nombres declarados.
  const extraMatchLines: ExtraMatchInfo[] =
    bet.extraMatches ??
    bet.conditions
      .filter((c) => c.match)
      .map((c) => ({
        key: normalizeName(`${c.match!.homeTeam}|${c.match!.awayTeam}`),
        homeTeam: c.match!.homeTeam,
        awayTeam: c.match!.awayTeam,
        status: 'SCHEDULED' as const,
      }));
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

      {/* Partidos extra del builder multi-partido, cada uno con su marcador */}
      {extraMatchLines.length > 0 && (
        <div className='mb-3 space-y-1'>
          {extraMatchLines.map((em) => (
            <div
              key={em.key}
              className='flex items-center gap-2 text-sm text-slate-300'
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  em.status === 'LIVE'
                    ? 'animate-pulse bg-red-500'
                    : em.status === 'FINISHED'
                      ? 'bg-slate-600'
                      : 'bg-sky-500/70'
                }`}
                title={
                  em.status === 'LIVE'
                    ? 'En vivo'
                    : em.status === 'FINISHED'
                      ? 'Finalizado'
                      : em.status === 'POSTPONED'
                        ? 'Suspendido'
                        : 'Programado'
                }
              />
              <span className='truncate'>{em.homeTeam}</span>
              {em.homeScore !== undefined && (
                <span className='font-mono-numbers shrink-0 rounded-sm border border-white/10 bg-base px-1.5 text-xs font-bold text-sky-300'>
                  {em.homeScore} - {em.awayScore}
                </span>
              )}
              <span className='text-xs font-normal text-slate-500'>vs</span>
              <span className='truncate'>{em.awayTeam}</span>
              {em.minute && (
                <span className='font-mono-numbers shrink-0 text-[10px] text-slate-500'>
                  {em.minute}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

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
            {hasVoidedConditions && hasEstimatedLegs(bet) && (
              <span
                title='Basado en cuotas estimadas: cargá las cuotas reales desde "Anular…" para que coincida con tu casa'
                className='ml-1 text-[9px] font-normal text-slate-500'
              >
                (est.)
              </span>
            )}
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
          {bet.conditions.map((cond: BetCondition) => (
            <ConditionRow
              key={cond.id}
              bet={bet}
              cond={cond}
              onUpdateDelta={(delta) => updateCondition(bet.id, cond.id, delta)}
              onOpenSwap={() => openSwapDialog(cond)}
              onOpenSuspend={() => setShowSuspendDialog(true)}
            />
          ))}
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
        setConditionOdds={setConditionOdds}
      />

      {/* Diálogo: Super Sub (cambio de jugador) */}
      <SwapPlayerDialog
        isOpen={swapConditionId !== null}
        onClose={() => setSwapConditionId(null)}
        condition={swapCondition ?? null}
        swapText={swapText}
        onSwapTextChange={setSwapText}
        onConfirm={(newName) => {
          if (swapConditionId) {
            swapPlayer(bet.id, swapConditionId, newName);
          }
          setSwapConditionId(null);
        }}
      />
    </div>
  );
}

export const BetCard = memo(BetCardComponent);
