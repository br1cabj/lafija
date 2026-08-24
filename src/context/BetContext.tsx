import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import type { Bet, UserStats } from '../types/bet';
import type { OddsFormat } from '../utils/odds';
import { initialBets, initialStats } from '../data/mockBets';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';

export interface LiveEventLog {
  id: string;
  time: string;
  betId: string;
  matchTitle: string;
  text: string;
  type: 'GOAL' | 'CORNER' | 'CARD' | 'SHOT' | 'CUMPLIDO' | 'CLUTCH' | 'INFO';
}

interface BetContextType {
  bets: Bet[];
  stats: UserStats;
  initialBankroll: number;
  setInitialBankroll: (amount: number) => void;
  filter: string;
  setFilter: (f: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedSport: string;
  setSelectedSport: (s: string) => void;
  oddsFormat: OddsFormat;
  setOddsFormat: (f: OddsFormat) => void;
  currency: 'ARS' | 'USD';
  setCurrency: (c: 'ARS' | 'USD') => void;
  currencySymbol: string;
  isSimulating: boolean;
  toggleSimulation: () => void;
  liveLogs: LiveEventLog[];
  addBet: (betData: Omit<Bet, 'id' | 'createdAt'>) => void;
  deleteBet: (id: string) => void;
  clearAllBets: () => void;
  restoreDemoBets: () => void;
  updateCondition: (
    betId: string,
    conditionId: string,
    deltaValue: number,
  ) => void;
  cashoutBet: (betId: string) => void;
  settleBet: (betId: string, outcome: 'WON' | 'LOST' | 'VOID') => void;
  setBetStatus: (betId: string, status: Bet['status']) => void;
  recalcStats: () => void;
}

const BetContext = createContext<BetContextType | undefined>(undefined);

const STORAGE_KEY = 'lafija_bets_v1';
const ODDS_FORMAT_KEY = 'lafija_odds_format_v1';
const CURRENCY_KEY = 'lafija_currency_v1';
const INITIAL_BANKROLL_KEY = 'lafija_initial_bankroll_v1';

export const BetProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [initialBankroll, setInitialBankrollState] = useState<number>(() => {
    const saved = localStorage.getItem(INITIAL_BANKROLL_KEY);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    return initialStats.initialBankroll;
  });

  const setInitialBankroll = (amount: number) => {
    setInitialBankrollState(amount);
    localStorage.setItem(INITIAL_BANKROLL_KEY, String(amount));
  };

  const [currency, setCurrencyState] = useState<'ARS' | 'USD'>(() => {
    const saved = localStorage.getItem(CURRENCY_KEY);
    return saved === 'USD' ? 'USD' : 'ARS';
  });

  const setCurrency = (c: 'ARS' | 'USD') => {
    setCurrencyState(c);
    localStorage.setItem(CURRENCY_KEY, c);
  };

  const currencySymbol = currency === 'ARS' ? '$' : 'US$';

  const [oddsFormat, setOddsFormatState] = useState<OddsFormat>(() => {
    const saved = localStorage.getItem(ODDS_FORMAT_KEY) as OddsFormat;
    return saved === 'american' || saved === 'fractional' || saved === 'implied'
      ? saved
      : 'decimal';
  });

  const setOddsFormat = (format: OddsFormat) => {
    setOddsFormatState(format);
    localStorage.setItem(ODDS_FORMAT_KEY, format);
  };

  const [bets, setBets] = useState<Bet[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return initialBets;
      }
    }
    return initialBets;
  });

  const [filter, setFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [liveLogs, setLiveLogs] = useState<LiveEventLog[]>([
    {
      id: 'log-1',
      time: '79:12',
      betId: 'bet-001',
      matchTitle: 'Real Madrid vs Man City',
      text: 'Vinicius Jr remató al arco (2do remate) -> ¡Condición Cumplida!',
      type: 'CUMPLIDO',
    },
    {
      id: 'log-2',
      time: '75:40',
      betId: 'bet-001',
      matchTitle: 'Real Madrid vs Man City',
      text: 'Córner #7 para Real Madrid. Faltan 2 para cumplir condición.',
      type: 'CORNER',
    },
  ]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));
  }, [bets]);

  // Derive stats reactively with useMemo (no cascading effect renders)
  const stats = useMemo<UserStats>(() => {
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
    const winRate =
      settledCount > 0 ? (wonBets.length / settledCount) * 100 : 0;

    const settledStaked =
      wonBets.reduce((a, b) => a + b.stake, 0) +
      lostBets.reduce((a, b) => a + b.stake, 0) +
      cashoutBets.reduce((a, b) => a + b.stake, 0);
    const netProfit =
      totalWon - (settledStaked + voidBets.reduce((a, b) => a + b.stake, 0));
    const roi = settledStaked > 0 ? (netProfit / settledStaked) * 100 : 0;

    // Clutch bets are live bets with at least one condition in danger or past minute 75
    const clutchBets = liveBets.filter((b) =>
      b.conditions.some((c) => c.status === 'CLUTCH_DANGER'),
    ).length;

    // Faceit rating based on win rate & profit
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
      faceitLevel: level,
      eloRating: elo,
    };
  }, [bets, initialBankroll]);

  const recalcStats = useCallback(() => {
    // Kept for backward compatibility
  }, []);

  // Simulation loop for live game dynamics (corners, goals, minute tick)
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      let soundToPlay: 'hit' | 'danger' | 'win' | null = null;
      const newLogs: LiveEventLog[] = [];
      let triggerConfetti = false;

      setBets((prevBets) => {
        return prevBets.map((bet) => {
          if (bet.status !== 'LIVE') return bet;

          // Safe minute increment
          const currentMin =
            parseInt(bet.match.minute?.replace(/[^0-9]/g, '') || '50', 10) ||
            50;
          const newMin = currentMin < 90 ? currentMin + 1 : 90;

          // Update conditions randomly
          const updatedConditions = bet.conditions.map((cond) => {
            if (cond.isLock || cond.status === 'MET') return cond;

            // If it's a numeric condition like corners/shots/cards
            if (
              typeof cond.targetValue === 'number' &&
              typeof cond.currentValue === 'number'
            ) {
              const shouldIncrement = Math.random() > 0.6;
              if (shouldIncrement) {
                const nextVal = cond.currentValue + 1;
                const nextProgress = Math.min(
                  100,
                  Math.round((nextVal / cond.targetValue) * 100),
                );
                const isNowMet = nextVal >= cond.targetValue;

                if (isNowMet) {
                  if (soundToPlay !== 'win') soundToPlay = 'hit';
                  newLogs.push({
                    id: `log-${Date.now()}-${Math.random()}`,
                    time: `${newMin}'`,
                    betId: bet.id,
                    matchTitle: `${bet.match.homeTeam} vs ${bet.match.awayTeam}`,
                    text: `🎯 ¡HIT! ${cond.selection} alcanzado (${nextVal}/${cond.targetValue})`,
                    type: 'CUMPLIDO',
                  });
                } else {
                  newLogs.push({
                    id: `log-${Date.now()}-${Math.random()}`,
                    time: `${newMin}'`,
                    betId: bet.id,
                    matchTitle: `${bet.match.homeTeam} vs ${bet.match.awayTeam}`,
                    text: `⚡ Progreso en ${cond.market}: ${nextVal}/${cond.targetValue} ${cond.unit || ''}`,
                    type: 'CORNER',
                  });
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

            // If time is late, flag clutch danger
            if (newMin >= 80 && cond.status === 'IN_PROGRESS') {
              if (!soundToPlay) soundToPlay = 'danger';
              return {
                ...cond,
                status: 'CLUTCH_DANGER' as const,
                dangerNote: `⚠️ TIEMPO CRÍTICO: ${newMin}' - Faltan condiciones`,
              };
            }

            return cond;
          });

          // Check if all conditions are met
          const allMet =
            updatedConditions.length > 0 &&
            updatedConditions.every((c) => c.status === 'MET');
          if (allMet && bet.status === 'LIVE') {
            soundToPlay = 'win';
            triggerConfetti = true;
            return {
              ...bet,
              match: { ...bet.match, minute: `${newMin}'` },
              conditions: updatedConditions,
              status: 'WON',
            };
          }

          // Dynamic cashout value variation (safe from 0 conditions)
          const metCount = updatedConditions.filter(
            (c) => c.status === 'MET',
          ).length;
          const ratio =
            updatedConditions.length > 0
              ? metCount / updatedConditions.length
              : 0;
          const dynamicCashout =
            Math.round(bet.stake * (1 + ratio * (bet.odds - 1) * 0.85) * 100) /
            100;

          return {
            ...bet,
            match: {
              ...bet.match,
              minute: `${newMin}'`,
            },
            cashoutValue: dynamicCashout,
            conditions: updatedConditions,
          };
        });
      });

      // Trigger side-effects outside of state updater
      if (soundToPlay === 'win') {
        sounds.playWinSound();
      } else if (soundToPlay === 'hit') {
        sounds.playHitSound();
      } else if (soundToPlay === 'danger') {
        sounds.playDangerSound();
      }

      if (triggerConfetti) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      if (newLogs.length > 0) {
        setLiveLogs((logs) => [...newLogs, ...logs].slice(0, 20));
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const toggleSimulation = () => {
    setIsSimulating((prev) => !prev);
  };

  const addBet = (betData: Omit<Bet, 'id' | 'createdAt'>) => {
    const newBet: Bet = {
      ...betData,
      id: `bet-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setBets((prev) => [newBet, ...prev]);

    setLiveLogs((logs) => [
      {
        id: `log-${Date.now()}`,
        time: 'AHORA',
        betId: newBet.id,
        matchTitle: `${newBet.match.homeTeam} vs ${newBet.match.awayTeam}`,
        text: `Registrada nueva apuesta: Cuota ${newBet.odds.toFixed(2)} [Stake $${newBet.stake}]`,
        type: 'INFO',
      },
      ...logs.slice(0, 19),
    ]);
  };

  const deleteBet = (id: string) => {
    setBets((prev) => prev.filter((b) => b.id !== id));
  };

  const clearAllBets = () => {
    setBets([]);
    setLiveLogs([]);
  };

  const restoreDemoBets = () => {
    setBets(initialBets);
    setLiveLogs([
      {
        id: `log-${Date.now()}-1`,
        time: '79:12',
        betId: 'bet-001',
        matchTitle: 'Real Madrid vs Man City',
        text: 'Vinicius Jr remató al arco (2do remate) -> ¡Condición Cumplida!',
        type: 'CUMPLIDO',
      },
      {
        id: `log-${Date.now()}-2`,
        time: '75:40',
        betId: 'bet-001',
        matchTitle: 'Real Madrid vs Man City',
        text: 'Córner #7 para Real Madrid. Faltan 2 para cumplir condición.',
        type: 'CORNER',
      },
    ]);
  };

  const updateCondition = (
    betId: string,
    conditionId: string,
    deltaValue: number,
  ) => {
    setBets((prev) =>
      prev.map((bet) => {
        if (bet.id !== betId) return bet;

        const newConditions = bet.conditions.map((cond) => {
          if (cond.id !== conditionId) return cond;
          if (
            typeof cond.currentValue === 'number' &&
            typeof cond.targetValue === 'number'
          ) {
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
          }
          return cond;
        });

        const allMet =
          newConditions.length > 0 &&
          newConditions.every((c) => c.status === 'MET');
        if (allMet) {
          sounds.playWinSound();
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
          });
        } else if (deltaValue > 0) {
          sounds.playHitSound();
        }

        // Recalculate dynamic cashout
        const metCount = newConditions.filter((c) => c.status === 'MET').length;
        const ratio =
          newConditions.length > 0 ? metCount / newConditions.length : 0;
        const dynamicCashout =
          Math.round(bet.stake * (1 + ratio * (bet.odds - 1) * 0.85) * 100) /
          100;

        let nextStatus = bet.status;
        if (allMet) {
          nextStatus = 'WON';
        } else if (bet.status === 'WON' && !allMet) {
          nextStatus = 'LIVE';
        }

        return {
          ...bet,
          status: nextStatus,
          cashoutValue: dynamicCashout,
          conditions: newConditions,
        };
      }),
    );
  };

  const cashoutBet = (betId: string) => {
    sounds.playClickSound();
    setBets((prev) =>
      prev.map((bet) => {
        if (bet.id === betId) {
          return {
            ...bet,
            status: 'CASHOUT',
          };
        }
        return bet;
      }),
    );

    setLiveLogs((logs) => [
      {
        id: `log-${Date.now()}`,
        time: 'CASHOUT',
        betId,
        matchTitle: 'Cashout Ejecutado',
        text: `Apuesta cerrada exitosamente asegurando ganancia`,
        type: 'INFO',
      },
      ...logs.slice(0, 19),
    ]);
  };

  const settleBet = (betId: string, outcome: 'WON' | 'LOST' | 'VOID') => {
    setBets((prev) =>
      prev.map((bet) => {
        if (bet.id === betId) {
          if (outcome === 'WON') {
            sounds.playWinSound();
            confetti({
              particleCount: 100,
              spread: 90,
              origin: { y: 0.5 },
            });
          } else {
            sounds.playClickSound();
          }
          return {
            ...bet,
            status: outcome,
          };
        }
        return bet;
      }),
    );
  };

  const setBetStatus = (betId: string, status: Bet['status']) => {
    sounds.playClickSound();
    setBets((prev) =>
      prev.map((bet) => {
        if (bet.id === betId) {
          const isLive = status === 'LIVE';
          return {
            ...bet,
            status,
            match: {
              ...bet.match,
              status: isLive
                ? 'LIVE'
                : status === 'PENDING'
                  ? 'SCHEDULED'
                  : 'FINISHED',
              minute: isLive ? bet.match.minute || "01'" : bet.match.minute,
            },
          };
        }
        return bet;
      }),
    );
  };

  return (
    <BetContext.Provider
      value={{
        bets,
        stats,
        initialBankroll,
        setInitialBankroll,
        filter,
        setFilter,
        searchQuery,
        setSearchQuery,
        selectedSport,
        setSelectedSport,
        oddsFormat,
        setOddsFormat,
        currency,
        setCurrency,
        currencySymbol,
        isSimulating,
        toggleSimulation,
        liveLogs,
        addBet,
        deleteBet,
        clearAllBets,
        restoreDemoBets,
        updateCondition,
        cashoutBet,
        settleBet,
        setBetStatus,
        recalcStats,
      }}
    >
      {children}
    </BetContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useBets = () => {
  const context = useContext(BetContext);
  if (!context) {
    throw new Error('useBets must be used within a BetProvider');
  }
  return context;
};
