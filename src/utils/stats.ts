import type { Bet, UserStats } from '../types/bet';

/** Calcula todas las estadísticas derivadas de las apuestas. Función pura. */
export function computeUserStats(
  bets: Bet[],
  initialBankroll: number,
): UserStats {
  const totalStaked = bets.reduce((acc, b) => acc + b.stake, 0);
  const wonBets = bets.filter((b) => b.status === 'WON');
  const lostBets = bets.filter((b) => b.status === 'LOST');
  const cashoutBets = bets.filter((b) => b.status === 'CASHOUT');
  const voidBets = bets.filter((b) => b.status === 'VOID');
  const liveBets = bets.filter((b) => b.status === 'LIVE');

  const totalWon =
    wonBets.reduce((acc, b) => acc + b.potentialPayout, 0) +
    cashoutBets.reduce((acc, b) => acc + (b.cashoutValue || 0), 0) +
    voidBets.reduce((acc, b) => acc + b.stake, 0);

  const settledCount = wonBets.length + lostBets.length + cashoutBets.length;
  const winRate = settledCount > 0 ? (wonBets.length / settledCount) * 100 : 0;

  const settledStaked =
    wonBets.reduce((a, b) => a + b.stake, 0) +
    lostBets.reduce((a, b) => a + b.stake, 0) +
    cashoutBets.reduce((a, b) => a + b.stake, 0);
  const netProfit =
    totalWon - (settledStaked + voidBets.reduce((a, b) => a + b.stake, 0));
  // Yield (ROI deportivo) = beneficio neto / stake apostado en apuestas resueltas
  const roi = settledStaked > 0 ? (netProfit / settledStaked) * 100 : 0;

  const clutchBets = liveBets.filter((b) =>
    b.conditions.some((c) => c.status === 'CLUTCH_DANGER'),
  ).length;

  // Rating estilo ELO derivado del win rate y el beneficio neto
  const elo = Math.round(1500 + winRate * 5 + netProfit * 0.4);
  const level = Math.min(10, Math.max(1, Math.floor(elo / 200)));

  return {
    bankroll: Number((initialBankroll + netProfit).toFixed(2)),
    initialBankroll,
    totalStaked: Number(totalStaked.toFixed(2)),
    totalWon: Number(totalWon.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
    roi: Number(roi.toFixed(2)),
    yield: Number(roi.toFixed(2)),
    winRate: Number(winRate.toFixed(1)),
    activeBets: bets.filter(
      (b) => b.status === 'LIVE' || b.status === 'PENDING',
    ).length,
    liveBets: liveBets.length,
    clutchBets,
    winStreak: wonBets.length > 0 ? Math.min(wonBets.length, 5) : 0,
    rankLevel: level,
    eloRating: elo,
  };
}
