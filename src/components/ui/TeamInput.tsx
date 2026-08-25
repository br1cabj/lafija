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
 * el usuario. Navegable con teclado (↑ ↓ Enter Escape).
 */
export const TeamInput: React.FC<TeamInputProps> = ({
  id,
  label,
  value,
  onChange,
}) => {
  const [suggestions, setSuggestions] = useState<TeamSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleChange = (text: string) => {
    onChange(text, undefined);
    setActiveIdx(0);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        // El form solo envía en el paso 3; acá seleccionar gana
        e.preventDefault();
        pick(suggestions[activeIdx]);
        break;
      case 'Escape':
        e.stopPropagation();
        setOpen(false);
        break;
    }
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
        role='combobox'
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-autocomplete='list'
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
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
        <ul
          id={`${id}-listbox`}
          role='listbox'
          aria-label={label}
          className='absolute z-30 mt-1 w-full rounded-md border border-white/15 bg-elevated py-1 text-xs shadow-2xl'
        >
          {suggestions.map((s, i) => (
            <li key={s.id} role='option' aria-selected={i === activeIdx}>
              <button
                type='button'
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
                  i === activeIdx ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
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
