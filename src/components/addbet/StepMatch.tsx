import React from 'react';
import { ArrowRight, Calendar, Radio } from 'lucide-react';
import type { BetType, SportType } from '../../types/bet';
import { SPORT_OPTIONS } from '../../data/sports';
import { TeamInput } from '../ui/TeamInput';

interface StepMatchProps {
  matchStatus: 'LIVE' | 'PENDING';
  onMatchStatusChange: (status: 'LIVE' | 'PENDING') => void;
  sport: SportType;
  onSportChange: (sport: SportType) => void;
  betType: BetType;
  onBetTypeChange: (type: BetType) => void;
  league: string;
  onLeagueChange: (league: string) => void;
  activeGroupIdx: number;
  totalGroups: number;
  allowsMultipleMatches: boolean;
  homeTeam: string;
  awayTeam: string;
  groupKey: number;
  onTeamChange: (side: 'home' | 'away', name: string, teamId?: number) => void;
  canContinue: boolean;
  onNext: () => void;
  onCancel: () => void;
}

export const StepMatch: React.FC<StepMatchProps> = ({
  matchStatus,
  onMatchStatusChange,
  sport,
  onSportChange,
  betType,
  onBetTypeChange,
  league,
  onLeagueChange,
  activeGroupIdx,
  totalGroups,
  allowsMultipleMatches,
  homeTeam,
  awayTeam,
  groupKey,
  onTeamChange,
  canContinue,
  onNext,
  onCancel,
}) => {
  return (
    <>
      {/* En Vivo vs Pre-Partido */}
      <div className='flex bg-base p-1 rounded-lg border border-white/10 text-xs font-mono'>
        <button
          type='button'
          onClick={() => onMatchStatusChange('LIVE')}
          aria-pressed={matchStatus === 'LIVE'}
          className={`flex-1 py-1.5 rounded-md transition-all font-bold flex items-center justify-center gap-1.5 ${
            matchStatus === 'LIVE'
              ? 'bg-red-600 text-white shadow-sm shadow-red-950/50'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Radio
            className={`w-3.5 h-3.5 ${matchStatus === 'LIVE' ? 'animate-pulse' : ''}`}
          />
          <span>En Vivo</span>
        </button>
        <button
          type='button'
          onClick={() => onMatchStatusChange('PENDING')}
          aria-pressed={matchStatus === 'PENDING'}
          className={`flex-1 py-1.5 rounded-md transition-all font-bold flex items-center justify-center gap-1.5 ${
            matchStatus === 'PENDING'
              ? 'bg-brand text-white shadow-sm shadow-orange-950/50'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className='w-3.5 h-3.5' />
          <span>Pre-Partido</span>
        </button>
      </div>

      {/* Deporte y tipo */}
      <div className='grid grid-cols-2 gap-3'>
        <div>
          <label
            htmlFor='abm-sport'
            className='text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1'
          >
            Deporte
          </label>
          <select
            id='abm-sport'
            value={sport}
            onChange={(e) => onSportChange(e.target.value as SportType)}
            className='w-full bg-base border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-brand focus:outline-none'
          >
            {SPORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor='abm-type'
            className='text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1'
          >
            Tipo de Apuesta
          </label>
          <select
            id='abm-type'
            value={betType}
            onChange={(e) => onBetTypeChange(e.target.value as BetType)}
            className='w-full bg-base border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-brand focus:outline-none'
          >
            <option value='bet_builder'>Bet Builder / Combinada</option>
            <option value='parlay'>Parlay (varios partidos)</option>
            <option value='single'>Simple (1 selección)</option>
          </select>
        </div>
      </div>

      {/* Equipos del partido en curso */}
      {allowsMultipleMatches && totalGroups > 1 && (
        <p className='text-[11px] font-bold tracking-wide text-brand uppercase font-mono'>
          Partido {activeGroupIdx + 1} de {totalGroups}
        </p>
      )}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <TeamInput
          id={`abm-home-${groupKey}`}
          label='Equipo Local / Jugador 1'
          value={homeTeam}
          onChange={(name, teamId) => onTeamChange('home', name, teamId)}
        />

        <TeamInput
          id={`abm-away-${groupKey}`}
          label='Equipo Visitante / Jugador 2'
          value={awayTeam}
          onChange={(name, teamId) => onTeamChange('away', name, teamId)}
        />
      </div>

      {/* Liga */}
      <div>
        <label
          htmlFor='abm-league'
          className='text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1'
        >
          Liga / Competición{' '}
          <span className='normal-case text-slate-600'>(opcional)</span>
        </label>
        <input
          id='abm-league'
          type='text'
          value={league}
          onChange={(e) => onLeagueChange(e.target.value)}
          className='w-full bg-base border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-brand focus:outline-none'
        />
      </div>

      {!canContinue && (
        <p className='flex items-center gap-1.5 text-[11px] text-slate-500'>
          Cargá los dos equipos para continuar.
        </p>
      )}

      {/* Nav paso 1 */}
      <div className='flex items-center justify-between pt-2 border-t border-white/10'>
        <button
          type='button'
          onClick={onCancel}
          className='px-4 py-2 rounded text-xs font-semibold uppercase text-slate-500 hover:text-white'
        >
          Cancelar
        </button>
        <button
          type='button'
          onClick={onNext}
          disabled={!canContinue}
          className='flex items-center gap-1.5 px-5 py-2 rounded bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-950/40 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none'
        >
          Siguiente
          <ArrowRight className='w-4 h-4' />
        </button>
      </div>
    </>
  );
};
