import React, { useEffect, useRef, useState } from 'react';
import {
  fetchTeamSuggestions,
  type TeamSuggestion,
} from '../../services/sportsApi';

interface TeamInputProps {
  id: string;
  label: string;
  value: string;
  /** Recibe el nombre (canónico si se elige una sugerencia) y el teamId de la API. */
  onChange: (name: string, teamId: number | undefined) => void;
}

/**
 * Input de equipo con autocomplete contra /api/sports?teamsSearch=
 * Al elegir una sugerencia se guardan el nombre canónico y el ID:
 * el matching en vivo pasa a ser exacto, sin depender de cómo escribió
 * el usuario.
 */
export const TeamInput: React.FC<TeamInputProps> = ({
  id,
  label,
  value,
  onChange,
}) => {
  const [suggestions, setSuggestions] = useState<TeamSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleChange = (text: string) => {
    onChange(text, undefined);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const results = await fetchTeamSuggestions(text);
      setSuggestions(results);
      setOpen(results.length > 0);
    }, 400);
  };

  const pick = (s: TeamSuggestion) => {
    onChange(s.name, s.id);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className='relative'>
      <label
        htmlFor={id}
        className='mb-1 block text-xs font-semibold tracking-wider text-slate-400 uppercase'
      >
        {label}
      </label>
      <input
        id={id}
        type='text'
        required
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          // Delay para que el click en una sugerencia gane el onMouseDown
          setTimeout(() => setOpen(false), 150);
        }}
        autoComplete='off'
        className='w-full rounded-md border border-white/10 bg-base px-3 py-2 text-sm text-white transition-colors focus:border-brand focus:outline-none'
      />
      {open && (
        <ul className='absolute z-30 mt-1 w-full rounded-md border border-white/15 bg-elevated py-1 text-xs shadow-2xl'>
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type='button'
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                className='flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-white/5'
              >
                <span className='truncate text-slate-200'>{s.name}</span>
                <span className='shrink-0 text-[10px] text-slate-500'>
                  {s.country}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
