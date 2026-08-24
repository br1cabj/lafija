import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import type { Bet, UserStats, LiveEventLog } from '../types/bet';
import { effectiveOdds } from '../types/bet';
import type { Note } from '../types/note';
import type { OddsFormat } from '../utils/odds';
import { sounds } from '../utils/audio';
import { computeUserStats } from '../utils/stats';
import { tickLiveBets, applyConditionDelta } from '../utils/simulation';
import { findFixtureForBet, applyLiveUpdate, needsStats } from '../utils/liveSync';
import {
  fetchLiveFixtures,
  fetchFixtureStats,
  type LiveFixtureStats,
} from '../services/sportsApi';
import { useAuth } from './AuthContext';
import { canSyncToCloud } from '../services/supabase';
import { fetchRemoteBets, syncBetsToCloud } from '../services/betsRepo';
import confetti from 'canvas-confetti';

export type { LiveEventLog };

export interface BetCounts {
  all: number;
  live: number;
  pending: number;
  won: number;
  lost: number;
  cashout: number;
}

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface BetContextType {
  bets: Bet[];
  stats: UserStats;
  counts: BetCounts;
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
  /** Modo datos reales: sincroniza condiciones con partidos en vivo vía /api/sports. */
  isRealMode: boolean;
  toggleRealMode: () => void;
  lastSyncAt: string | null;
  syncLiveData: () => Promise<void>;
  liveLogs: LiveEventLog[];
  /** Estado de la sincronización con la nube (Supabase). */
  cloudSyncStatus: CloudSyncStatus;
  lastCloudSyncAt: string | null;
  retryCloudSync: () => void;
  exportBackup: () => void;
  addBet: (betData: Omit<Bet, 'id' | 'createdAt'>) => void;
  deleteBet: (id: string) => void;
  clearAllBets: () => void;
  updateCondition: (
    betId: string,
    conditionId: string,
    deltaValue: number,
  ) => void;
  cashoutBet: (betId: string) => void;
  settleBet: (betId: string, outcome: 'WON' | 'LOST' | 'VOID') => void;
  /** Anula condiciones por suspensión del partido (regla de cuota 1.0). */
  voidConditions: (betId: string, conditionIds: string[]) => void;
  /** Super Sub: la línea de la selección hereda al suplente que entró. */
  swapPlayer: (betId: string, conditionId: string, newSelection: string) => void;
  setBetStatus: (betId: string, status: Bet['status']) => void;
}

const BetContext = createContext<BetContextType | undefined>(undefined);

const STORAGE_KEY = 'lafija_bets_v1';
const ODDS_FORMAT_KEY = 'lafija_odds_format_v1';
const CURRENCY_KEY = 'lafija_currency_v1';
const INITIAL_BANKROLL_KEY = 'lafija_initial_bankroll_v1';
const REAL_MODE_KEY = 'lafija_real_mode_v1';
/** Bankroll inicial hasta que el usuario configure el suyo. */
const DEFAULT_INITIAL_BANKROLL = 0;
/** Intervalo de sincronización con datos reales (ms). */
const REAL_SYNC_INTERVAL_MS = 60_000;
/** Cadencia mínima de fetch de estadísticas por partido (ms): cambian lento. */
const STATS_TTL_MS = 3 * 60_000;

function readLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage bloqueado (p.ej. Safari privado): se ignora silenciosamente.
  }
}

/** Ids de las semillas demo de versiones anteriores (se descargan al cargar). */
const LEGACY_MOCK_BET_IDS = new Set([
  'bet-001',
  'bet-002',
  'bet-003',
  'bet-004',
  'bet-005',
]);

function loadInitialBets(): Bet[] {
  const saved = readLocalStorage(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Bet[];
      // Purga de datos demo heredados de versiones con mocks
      return Array.isArray(parsed)
        ? parsed.filter((b) => !LEGACY_MOCK_BET_IDS.has(b.id))
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

export const BetProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();

  const [initialBankroll, setInitialBankrollState] = useState<number>(() => {
    const saved = readLocalStorage(INITIAL_BANKROLL_KEY);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    return DEFAULT_INITIAL_BANKROLL;
  });

  const setInitialBankroll = (amount: number) => {
    setInitialBankrollState(amount);
    writeLocalStorage(INITIAL_BANKROLL_KEY, String(amount));
  };

  const [currency, setCurrencyState] = useState<'ARS' | 'USD'>(() => {
    const saved = readLocalStorage(CURRENCY_KEY);
    return saved === 'USD' ? 'USD' : 'ARS';
  });

  const setCurrency = (c: 'ARS' | 'USD') => {
    setCurrencyState(c);
    writeLocalStorage(CURRENCY_KEY, c);
  };

  const currencySymbol = currency === 'ARS' ? '$' : 'US$';

  const [oddsFormat, setOddsFormatState] = useState<OddsFormat>(() => {
    const saved = readLocalStorage(ODDS_FORMAT_KEY) as OddsFormat;
    return saved === 'american' || saved === 'fractional' || saved === 'implied'
      ? saved
      : 'decimal';
  });

  const setOddsFormat = (format: OddsFormat) => {
    setOddsFormatState(format);
    writeLocalStorage(ODDS_FORMAT_KEY, format);
  };

  const [bets, setBets] = useState<Bet[]>(loadInitialBets);

  const [filter, setFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isRealMode, setIsRealModeState] = useState<boolean>(
    () => readLocalStorage(REAL_MODE_KEY) === 'true',
  );
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [liveLogs, setLiveLogs] = useState<LiveEventLog[]>([]);

  const setIsRealMode = (enabled: boolean) => {
    setIsRealModeState(enabled);
    writeLocalStorage(REAL_MODE_KEY, String(enabled));
  };

  // Mirror ref so the simulation interval always reads fresh bets without
  // stale closures or side effects inside state updaters.
  const betsRef = useRef(bets);
  useEffect(() => {
    betsRef.current = bets;
  }, [bets]);

  // Persist to localStorage
  useEffect(() => {
    writeLocalStorage(STORAGE_KEY, JSON.stringify(bets));
  }, [bets]);

  // ---- Supabase cloud sync ----
  const cloudUserId =
    user && !user.isGuest && canSyncToCloud() ? user.id : null;

  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('idle');
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<string | null>(null);

  // Pull remote bets once per logged-in user; remote wins over local draft.
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);
  const syncReady = Boolean(cloudUserId) && syncedUserId === cloudUserId;
  useEffect(() => {
    if (!cloudUserId) return;
    let cancelled = false;
    fetchRemoteBets(cloudUserId)
      .then((remoteBets) => {
        if (cancelled) return;
        if (remoteBets.length > 0) {
          setBets(remoteBets);
        } else {
          // First login: seed the cloud account with local data.
          syncBetsToCloud(cloudUserId, betsRef.current).catch(() => {
            setCloudSyncStatus('error');
          });
        }
        setSyncedUserId(cloudUserId);
        setCloudSyncStatus('synced');
        setLastCloudSyncAt(new Date().toISOString());
      })
      .catch(() => {
        if (!cancelled) setCloudSyncStatus('error');
        setSyncedUserId(cloudUserId);
      });
    return () => {
      cancelled = true;
    };
  }, [cloudUserId]);

  // Push de cada cambio local (con debounce) mientras hay sesión.
  const pushToCloud = useCallback(async () => {
    if (!cloudUserId || !syncReady) return;
    setCloudSyncStatus('syncing');
    try {
      await syncBetsToCloud(cloudUserId, betsRef.current);
      setCloudSyncStatus('synced');
      setLastCloudSyncAt(new Date().toISOString());
    } catch {
      setCloudSyncStatus('error');
    }
  }, [cloudUserId, syncReady]);

  // Debounced push of every local change while signed in.
  useEffect(() => {
    if (!cloudUserId || !syncReady) return;
    const timer = setTimeout(() => {
      void pushToCloud();
    }, 800);
    return () => clearTimeout(timer);
  }, [bets, cloudUserId, syncReady, pushToCloud]);

  const retryCloudSync = useCallback(() => {
    void pushToCloud();
  }, [pushToCloud]);

  /** Descarga un backup JSON con apuestas, notas y ajustes. */
  const exportBackup = useCallback(() => {
    let notes: Note[] = [];
    try {
      const saved = localStorage.getItem('lafija_notes_v1');
      if (saved) notes = JSON.parse(saved) as Note[];
    } catch {
      // notas ilegibles: se exportan vacías
    }
    const backup = {
      app: 'LA FIJA',
      version: 1,
      exportedAt: new Date().toISOString(),
      bets: betsRef.current,
      notes,
      initialBankroll,
      currency,
      oddsFormat,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lafija-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [initialBankroll, currency, oddsFormat]);

  // Derived stats & counts (single source of truth)
  const stats = useMemo(
    () => computeUserStats(bets, initialBankroll),
    [bets, initialBankroll],
  );

  const counts = useMemo<BetCounts>(
    () => ({
      all: bets.length,
      live: bets.filter((b) => b.status === 'LIVE').length,
      pending: bets.filter((b) => b.status === 'PENDING').length,
      won: bets.filter((b) => b.status === 'WON').length,
      lost: bets.filter((b) => b.status === 'LOST').length,
      cashout: bets.filter((b) => b.status === 'CASHOUT').length,
    }),
    [bets],
  );

  // Simulation loop - pure tick + side effects outside the updater
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const result = tickLiveBets(betsRef.current);

      if (result.logs.length > 0) {
        setLiveLogs((logs) => [...result.logs, ...logs].slice(0, 20));
      }

      if (result.sound === 'win') sounds.playWinSound();
      else if (result.sound === 'hit') sounds.playHitSound();
      else if (result.sound === 'danger') sounds.playDangerSound();

      if (result.confetti) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      }

      if (
        result.sound !== null ||
        result.confetti ||
        result.logs.length > 0 ||
        result.bets !== betsRef.current
      ) {
        betsRef.current = result.bets;
        setBets(result.bets);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const toggleSimulation = () =>
    setIsSimulating((prev) => {
      // Exclusión mutua: simulador y datos reales no pueden correr a la vez
      if (!prev) setIsRealMode(false);
      return !prev;
    });

  // ---- Modo datos reales (polling de partidos en vivo vía /api/sports) ----

  const realSyncingRef = useRef(false);
  // Última vez que se pidieron stats por evento (cadencia STATS_TTL_MS)
  const statsFetchedAtRef = useRef<Map<number, number>>(new Map());

  const syncLiveData = useCallback(async () => {
    if (realSyncingRef.current) return;
    const liveBets = betsRef.current.filter((b) => b.status === 'LIVE');
    if (liveBets.length === 0) return;

    realSyncingRef.current = true;
    try {
      const fixtures = await fetchLiveFixtures();
      if (fixtures.length === 0) {
        setLastSyncAt(new Date().toISOString());
        return;
      }

      const updates: { bet: Bet; hits: string[]; title: string }[] = [];
      const linkedFlags = new Map<string, boolean>();

      for (const bet of liveBets) {
        const fixture = findFixtureForBet(bet, fixtures);
        // Flag para el aviso de "seguimiento manual" en la tarjeta
        linkedFlags.set(bet.id, Boolean(fixture?.fixtureId));
        if (!fixture || !fixture.fixtureId) continue;

        // Stats solo si hay condiciones que las necesitan (córners, tarjetas,
        // remates, faltas) y como máximo cada 3 min por partido: cambian lento.
        let stats: LiveFixtureStats | null = null;
        if (fixture.statsId && needsStats(bet)) {
          const last = statsFetchedAtRef.current.get(fixture.statsId) ?? 0;
          if (Date.now() - last >= STATS_TTL_MS) {
            stats = await fetchFixtureStats(fixture.statsId);
            statsFetchedAtRef.current.set(fixture.statsId, Date.now());
          }
        }

        const result = applyLiveUpdate(bet, fixture, stats);
        if (result.bet !== bet) {
          updates.push({
            bet: result.bet,
            hits: result.newHits,
            title: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
          });
        }
      }

      // Aplica updates de datos + flags de vinculación en una sola pasada
      const updateMap = new Map(updates.map((u) => [u.bet.id, u]));
      setBets((prev) =>
        prev.map((b) => {
          const updated = updateMap.get(b.id)?.bet;
          if (updated) return { ...updated, match: { ...updated.match, linked: true } };
          const linked = linkedFlags.get(b.id);
          if (linked === undefined || linked === b.match.linked) return b;
          return { ...b, match: { ...b.match, linked } };
        }),
      );

      if (updates.length > 0) {
        const logs: LiveEventLog[] = updates.flatMap((u) =>
          u.hits.map((selection) => ({
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            time: 'REAL',
            betId: u.bet.id,
            matchTitle: u.title,
            text: `📡 ¡HIT en vivo! ${selection}`,
            type: 'CUMPLIDO' as const,
          })),
        );
        setLiveLogs((prevLogs) => [...logs, ...prevLogs].slice(0, 20));

        if (updates.some((u) => u.hits.length > 0)) sounds.playHitSound();
      }

      setLastSyncAt(new Date().toISOString());
    } catch (err) {
      console.warn('Error sincronizando datos reales:', err);
    } finally {
      realSyncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isRealMode) return;
    // Primer sync diferido para no hacer setState en el cuerpo del efecto
    const initial = setTimeout(() => void syncLiveData(), 0);
    const interval = setInterval(() => void syncLiveData(), REAL_SYNC_INTERVAL_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [isRealMode, syncLiveData]);

  const toggleRealMode = () =>
    setIsRealModeState((prev) => {
      const next = !prev;
      writeLocalStorage(REAL_MODE_KEY, String(next));
      // Exclusión mutua con el simulador
      if (next) setIsSimulating(false);
      return next;
    });

  const pushLog = useCallback((log: LiveEventLog) => {
    setLiveLogs((logs) => [log, ...logs].slice(0, 20));
  }, []);

  const addBet = (betData: Omit<Bet, 'id' | 'createdAt'>) => {
    const newBet: Bet = {
      ...betData,
      id: `bet-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setBets((prev) => [newBet, ...prev]);

    pushLog({
      id: `log-${Date.now()}`,
      time: 'AHORA',
      betId: newBet.id,
      matchTitle: `${newBet.match.homeTeam} vs ${newBet.match.awayTeam}`,
      text: `Registrada nueva apuesta: Cuota ${newBet.odds.toFixed(2)} [Stake ${currencySymbol}${newBet.stake}]`,
      type: 'INFO',
    });
  };

  const deleteBet = (id: string) => setBets((prev) => prev.filter((b) => b.id !== id));

  const clearAllBets = () => {
    setBets([]);
    setLiveLogs([]);
  };

  const updateCondition = (
    betId: string,
    conditionId: string,
    deltaValue: number,
  ) => {
    const target = betsRef.current.find((b) => b.id === betId);
    if (!target) return;

    const next = applyConditionDelta(target, conditionId, deltaValue);
    setBets((prev) => prev.map((b) => (b.id === betId ? next : b)));

    // Side effects outside the updater (StrictMode-safe)
    if (next.status === 'WON') {
      sounds.playWinSound();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    } else if (deltaValue > 0) {
      sounds.playHitSound();
    }
  };

  const cashoutBet = (betId: string) => {
    sounds.playClickSound();
    setBets((prev) =>
      prev.map((bet) =>
        bet.id === betId ? { ...bet, status: 'CASHOUT' as const } : bet,
      ),
    );
    pushLog({
      id: `log-${Date.now()}`,
      time: 'CASHOUT',
      betId,
      matchTitle: 'Cashout Ejecutado',
      text: 'Apuesta cerrada exitosamente asegurando ganancia',
      type: 'INFO',
    });
  };

  const settleBet = (betId: string, outcome: 'WON' | 'LOST' | 'VOID') => {
    if (outcome === 'WON') {
      sounds.playWinSound();
      confetti({ particleCount: 100, spread: 90, origin: { y: 0.5 } });
    } else {
      sounds.playClickSound();
    }
    setBets((prev) =>
      prev.map((bet) => {
        if (bet.id !== betId) return bet;
        // Con condiciones anuladas, el payout se calcula sobre la cuota
        // efectiva (las anuladas aportan 1.0).
        const payout =
          outcome === 'WON'
            ? Number((bet.stake * effectiveOdds(bet)).toFixed(2))
            : bet.potentialPayout;
        return { ...bet, status: outcome, potentialPayout: payout };
      }),
    );
  };

  const voidConditions = (betId: string, conditionIds: string[]) => {
    sounds.playClickSound();
    const ids = new Set(conditionIds);
    setBets((prev) =>
      prev.map((bet) => {
        if (bet.id !== betId) return bet;
        const conditions = bet.conditions.map((c) =>
          ids.has(c.id) ? { ...c, status: 'VOID' as const, isLock: true } : c,
        );
        // Si se anulan todas, la apuesta completa pasa a VOID (reembolso).
        const allVoid =
          conditions.length > 0 && conditions.every((c) => c.status === 'VOID');
        return {
          ...bet,
          conditions,
          status: allVoid ? ('VOID' as const) : bet.status,
        };
      }),
    );
    pushLog({
      id: `log-${Date.now()}`,
      time: 'VOID',
      betId,
      matchTitle: 'Partido suspendido',
      text: `${conditionIds.length} condición(es) anulada(s) — aportan cuota 1.0`,
      type: 'INFO',
    });
  };

  const swapPlayer = (
    betId: string,
    conditionId: string,
    newSelection: string,
  ) => {
    sounds.playClickSound();
    setBets((prev) =>
      prev.map((bet) => {
        if (bet.id !== betId) return bet;
        const conditions = bet.conditions.map((c) => {
          if (c.id !== conditionId) return c;
          return {
            ...c,
            selection: newSelection,
            // Conserva el jugador original de la primera herencia
            supersubFrom: c.supersubFrom ?? c.selection,
          };
        });
        return { ...bet, conditions };
      }),
    );
    pushLog({
      id: `log-${Date.now()}`,
      time: 'SUB',
      betId,
      matchTitle: 'Super Sub',
      text: `Cambio: la línea hereda al suplente`,
      type: 'INFO',
    });
  };

  const setBetStatus = (betId: string, status: Bet['status']) => {
    sounds.playClickSound();
    setBets((prev) =>
      prev.map((bet) => {
        if (bet.id !== betId) return bet;
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
      }),
    );
  };

  return (
    <BetContext.Provider
      value={{
        bets,
        stats,
        counts,
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
        isRealMode,
        toggleRealMode,
        lastSyncAt,
        syncLiveData,
        liveLogs,
        cloudSyncStatus,
        lastCloudSyncAt,
        retryCloudSync,
        exportBackup,
        addBet,
        deleteBet,
        clearAllBets,
        updateCondition,
        cashoutBet,
        settleBet,
        voidConditions,
        swapPlayer,
        setBetStatus,
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
