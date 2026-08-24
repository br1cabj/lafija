import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBets } from '../context/BetContext';
import { fetchLiveResults, type LiveResult } from '../services/resultsApi';
import { namesMatch } from '../utils/liveSync';
import { ChevronDown, ChevronUp, Radio } from 'lucide-react';

const COLLAPSED_KEY = 'lafija_results_collapsed_v1';
const POLL_MS = 60_000;
const MAX_TEAMS = 12;

const STATUS_STYLES: Record<string, string> = {
  LIVE: 'bg-red-500/15 text-red-400',
  HT: 'bg-red-500/15 text-red-400',
  FT: 'bg-white/10 text-slate-400',
  POSTPONED: 'bg-amber-500/15 text-amber-400',
  SCHEDULED: 'bg-white/10 text-slate-400',
};

/**
 * Sección colapsable con los resultados de los partidos vinculados a las
 * apuestas activas. Datos vía /api/results (ESPN/SofaScore): no consume
 * la cuota de API-Football. Poll cada 60s solo con apuestas en juego.
 */
export const LiveResults: React.FC = () => {
  const { bets } = useBets();
  const [results, setResults] = useState<LiveResult[]>([]);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const teamsRef = useRef<string>('');

  // Equipos de las apuestas activas (LIVE/PENDING), deduplicados
  const teamNames = useMemo(() => {
    const active = bets.filter(
      (b) => b.status === 'LIVE' || b.status === 'PENDING',
    );
    const set = new Set<string>();
    for (const bet of active) {
      if (set.size >= MAX_TEAMS) break;
      set.add(bet.match.homeTeam);
      if (set.size < MAX_TEAMS) set.add(bet.match.awayTeam);
    }
    return [...set];
  }, [bets]);

  const hasActiveBets = teamNames.length > 0;

  useEffect(() => {
    if (!hasActiveBets) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const key = teamNames.join('|');

    const poll = async () => {
      if (teamsRef.current !== key) {
        teamsRef.current = key;
      }
      const data = await fetchLiveResults(teamNames);
      if (!cancelled) setResults(data);
    };

    void poll();
    const interval = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamNames.join('|'), hasActiveBets]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, String(!prev));
      } catch {
        // storage bloqueado: solo estado en memoria
      }
      return !prev;
    });
  };

  if (!hasActiveBets) return null;

  const liveCount = results.filter(
    (r) => r.status === 'LIVE' || r.status === 'HT',
  ).length;

  return (
    <section className='panel-card mb-4 rounded-lg'>
      {/* Header colapsable */}
      <button
        type='button'
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        className='flex w-full items-center justify-between gap-2 px-4 py-3 text-left'
      >
        <span className='flex items-center gap-2 text-xs font-semibold tracking-wider text-white uppercase'>
          <Radio
            className={`h-4 w-4 ${liveCount > 0 ? 'animate-pulse text-red-400' : 'text-slate-500'}`}
          />
          Resultados de tus partidos
          {results.length > 0 && (
            <span className='font-mono-numbers rounded-full bg-white/5 px-1.5 text-[10px] text-slate-400'>
              {results.length}
            </span>
          )}
        </span>
        {collapsed ? (
          <ChevronDown className='h-4 w-4 text-slate-500' />
        ) : (
          <ChevronUp className='h-4 w-4 text-slate-500' />
        )}
      </button>

      {!collapsed && (
        <div className='border-t border-white/10 px-4 py-3'>
          {results.length === 0 ? (
            <p className='py-2 text-center text-xs text-slate-500'>
              Sin partidos en juego ahora mismo.
            </p>
          ) : (
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3'>
              {results.map((r) => {
                const isLive = r.status === 'LIVE' || r.status === 'HT';
                const involvesBet = bets.some(
                  (b) =>
                    (b.status === 'LIVE' || b.status === 'PENDING') &&
                    ((namesMatch(b.match.homeTeam, r.homeTeam) &&
                      namesMatch(b.match.awayTeam, r.awayTeam)) ||
                      (namesMatch(b.match.homeTeam, r.awayTeam) &&
                        namesMatch(b.match.awayTeam, r.homeTeam))),
                );
                return (
                  <div
                    key={r.id}
                    className={`rounded-md border p-2.5 ${
                      involvesBet
                        ? 'border-brand/40 bg-brand/5'
                        : 'border-white/10 bg-base'
                    }`}
                  >
                    <div className='mb-1.5 flex items-center justify-between gap-2'>
                      <span className='truncate text-[10px] tracking-wide text-slate-500 uppercase'>
                        {r.league}
                      </span>
                      <span
                        className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${
                          STATUS_STYLES[r.status] ??
                          'bg-white/10 text-slate-400'
                        }`}
                      >
                        {isLive ? r.minute || r.status : r.status}
                      </span>
                    </div>
                    <div className='font-mono-numbers flex items-center justify-between gap-2 text-sm'>
                      <span className='truncate text-slate-200'>
                        {r.homeTeam}
                      </span>
                      <span className='shrink-0 font-bold text-white'>
                        {r.homeScore} - {r.awayScore}
                      </span>
                      <span className='truncate text-right text-slate-200'>
                        {r.awayTeam}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
