import React from 'react';
import clsx from 'clsx';
import type { OddsFormat } from '../../utils/odds';

const FORMATS: {
  value: OddsFormat;
  short: string;
  full: string;
  hideClass?: string;
}[] = [
  { value: 'decimal', short: 'DEC', full: 'Decimal' },
  { value: 'american', short: 'AME', full: 'Americana' },
  { value: 'fractional', short: 'FRA', full: 'Fraccional', hideClass: 'hidden sm:block' },
  { value: 'implied', short: 'IMP', full: 'Prob %', hideClass: 'hidden md:block' },
];

interface OddsFormatTabsProps {
  value: OddsFormat;
  onChange: (format: OddsFormat) => void;
  /** compact = abreviaturas (header); full = labels largos (form) */
  variant?: 'compact' | 'full';
}

/** Selector de formato de cuota compartido por Header y AddBetModal. */
export const OddsFormatTabs: React.FC<OddsFormatTabsProps> = ({
  value,
  onChange,
  variant = 'compact',
}) => (
    <div
      className={clsx(
        'flex items-center rounded-sm border border-white/10 bg-panel p-0.5 text-[11px]',
      )}
      role='tablist'
      aria-label='Formato de cuota'
    >
    {FORMATS.map((f) => (
      <button
        key={f.value}
        type='button'
        role='tab'
        aria-selected={value === f.value}
        onClick={() => onChange(f.value)}
        className={clsx(
          'rounded transition-all',
          variant === 'compact' ? 'px-2 py-0.5' : 'px-2.5 py-1',
          f.hideClass,
          value === f.value
            ? 'bg-brand text-white font-bold'
            : 'text-slate-400 hover:text-white',
        )}
      >
        {variant === 'compact' ? f.short : f.full}
      </button>
    ))}
  </div>
);
