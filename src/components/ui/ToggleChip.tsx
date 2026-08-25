import React from 'react';
import { Check } from 'lucide-react';
import clsx from 'clsx';

interface ToggleChipProps {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: () => void;
  /** Clases del estado activo (borde/texto/fondo del tono elegido). */
  activeClass?: string;
}

/**
 * Chip-checkbox con estado siempre visible: ✓ y tono cuando activo,
 * neutro cuando no. Para controles rápidos que no merecen un menú.
 */
export const ToggleChip: React.FC<ToggleChipProps> = ({
  label,
  icon,
  checked,
  onChange,
  activeClass = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
}) => (
  <button
    type='button'
    role='checkbox'
    aria-checked={checked}
    onClick={onChange}
    title={`${label}: ${checked ? 'activado' : 'desactivado'}`}
    className={clsx(
      'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors duration-150',
      checked ? activeClass : 'border-white/10 bg-panel text-slate-400 hover:text-slate-200',
    )}
  >
    {checked ? (
      <Check className='h-3.5 w-3.5 shrink-0' />
    ) : (
      <span className='flex h-3.5 w-3.5 shrink-0 items-center justify-center'>
        {icon}
      </span>
    )}
    <span>{label}</span>
  </button>
);
