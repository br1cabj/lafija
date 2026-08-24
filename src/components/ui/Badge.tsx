import React from 'react';
import clsx from 'clsx';

export type BadgeVariant =
  | 'live'
  | 'pending'
  | 'won'
  | 'lost'
  | 'cashout'
  | 'clutch'
  | 'neutral';

const VARIANTS: Record<BadgeVariant, string> = {
  live: 'bg-red-500/10 border-red-500/30 text-red-400',
  pending: 'bg-white/5 border-white/10 text-slate-300',
  won: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  lost: 'bg-red-500/10 border-red-500/30 text-red-400',
  cashout: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  clutch: 'bg-amber-500/10 border-amber-500/40 text-amber-400',
  neutral: 'bg-white/5 border-white/10 text-slate-300',
};

const DOT_COLORS: Partial<Record<BadgeVariant, string>> = {
  live: 'bg-red-500',
  won: 'bg-emerald-400',
  lost: 'bg-red-400',
  cashout: 'bg-cyan-400',
  clutch: 'bg-amber-400',
};

interface BadgeProps {
  variant?: BadgeVariant;
  /** Punto de estado a la izquierda del label */
  dot?: boolean;
  /** Pulso solo para estado en vivo */
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  dot = false,
  pulse = false,
  children,
  className,
}) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
      VARIANTS[variant],
      className,
    )}
  >
    {dot && (
      <span
        className={clsx('w-1.5 h-1.5 rounded-full shrink-0', DOT_COLORS[variant] ?? 'bg-slate-400', pulse && 'animate-pulse')}
      />
    )}
    {children}
  </span>
);
