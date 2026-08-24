import type { Bet, BetCondition, LiveEventLog } from '../types/bet';
import { isNumericCondition } from '../types/bet';

export type SimulationSound = 'hit' | 'danger' | 'win' | null;

export interface SimulationResult {
  bets: Bet[];
  logs: LiveEventLog[];
  sound: SimulationSound;
  confetti: boolean;
}

/** Cashout dinámico en función de cuántas condiciones están cumplidas. */
export function computeCashout(bet: Bet, conditions: BetCondition[]): number {
  const metCount = conditions.filter((c) => c.status === 'MET').length;
  const ratio = conditions.length > 0 ? metCount / conditions.length : 0;
  return Math.round(bet.stake * (1 + ratio * (bet.odds - 1) * 0.85) * 100) / 100;
}

function makeLog(
  betId: string,
  matchTitle: string,
  time: string,
  text: string,
  type: LiveEventLog['type'],
): LiveEventLog {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time,
    betId,
    matchTitle,
    text,
    type,
  };
}

/**
 * Avanza un tick de simulación sobre las apuestas LIVE.
 * Función pura: no muta el estado ni dispara efectos; devuelve los nuevos
 * bets junto con los logs y efectos que el caller debe ejecutar.
 */
export function tickLiveBets(prevBets: Bet[]): SimulationResult {
  let sound: SimulationSound = null;
  let confetti = false;
  const logs: LiveEventLog[] = [];

  const bets = prevBets.map((bet) => {
    if (bet.status !== 'LIVE') return bet;

    const currentMin =
      parseInt(bet.match.minute?.replace(/[^0-9]/g, '') || '50', 10) || 50;
    const newMin = currentMin < 90 ? currentMin + 1 : 90;
    const matchTitle = `${bet.match.homeTeam} vs ${bet.match.awayTeam}`;

    const updatedConditions = bet.conditions.map((cond): BetCondition => {
      if (cond.isLock || cond.status === 'MET') return cond;

      if (isNumericCondition(cond)) {
        if (Math.random() > 0.6) {
          const nextVal = cond.currentValue + 1;
          const nextProgress = Math.min(
            100,
            Math.round((nextVal / cond.targetValue) * 100),
          );
          const isNowMet = nextVal >= cond.targetValue;

          if (isNowMet) {
            if (sound !== 'win') sound = 'hit';
            logs.push(
              makeLog(
                bet.id,
                matchTitle,
                `${newMin}'`,
                `🎯 ¡HIT! ${cond.selection} alcanzado (${nextVal}/${cond.targetValue})`,
                'CUMPLIDO',
              ),
            );
          } else {
            logs.push(
              makeLog(
                bet.id,
                matchTitle,
                `${newMin}'`,
                `Progreso en ${cond.market}: ${nextVal}/${cond.targetValue} ${cond.unit || ''}`,
                'CORNER',
              ),
            );
          }

          return {
            ...cond,
            currentValue: nextVal,
            progress: nextProgress,
            status: isNowMet
              ? ('MET' as const)
              : newMin > 80
                ? ('CLUTCH_DANGER' as const)
                : ('IN_PROGRESS' as const),
            isLock: isNowMet,
          };
        }
      }

      // Late-game warning for still-pending conditions
      if (newMin >= 80 && cond.status === 'IN_PROGRESS') {
        if (!sound) sound = 'danger';
        return {
          ...cond,
          status: 'CLUTCH_DANGER' as const,
          dangerNote: `Tiempo crítico: min ${newMin}' — faltan condiciones`,
        };
      }

      return cond;
    });

    const allMet =
      updatedConditions.length > 0 &&
      updatedConditions.every((c) => c.status === 'MET');
    if (allMet) {
      sound = 'win';
      confetti = true;
      const wonBet: Bet = {
        ...bet,
        match: { ...bet.match, minute: `${newMin}'` },
        conditions: updatedConditions,
        cashoutValue: computeCashout(bet, updatedConditions),
        status: 'WON',
      };
      return wonBet;
    }

    const liveBet: Bet = {
      ...bet,
      match: { ...bet.match, minute: `${newMin}'` },
      cashoutValue: computeCashout(bet, updatedConditions),
      conditions: updatedConditions,
    };
    return liveBet;
  });

  return { bets, logs, sound, confetti };
}

/**
 * Aplica +/-1 a una condición y recalcula estado global de la apuesta.
 * Función pura.
 */
export function applyConditionDelta(
  bet: Bet,
  conditionId: string,
  deltaValue: number,
): Bet {
  const newConditions = bet.conditions.map((cond) => {
    if (cond.id !== conditionId) return cond;
    if (!isNumericCondition(cond)) return cond;

    const updatedVal = Math.max(0, cond.currentValue + deltaValue);
    const isMet = updatedVal >= cond.targetValue;
    const progress = Math.min(
      100,
      Math.round((updatedVal / cond.targetValue) * 100),
    );

    return {
      ...cond,
      currentValue: updatedVal,
      progress,
      status: isMet ? ('MET' as const) : ('IN_PROGRESS' as const),
      isLock: isMet,
    };
  });

  const allMet =
    newConditions.length > 0 && newConditions.every((c) => c.status === 'MET');

  let nextStatus = bet.status;
  if (allMet) {
    nextStatus = 'WON';
  } else if (bet.status === 'WON' && !allMet) {
    nextStatus = 'LIVE';
  }

  return {
    ...bet,
    status: nextStatus,
    cashoutValue: computeCashout(bet, newConditions),
    conditions: newConditions,
  };
}
