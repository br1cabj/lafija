import React from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover',
  secondary:
    'bg-panel border border-white/10 text-slate-300 hover:text-white hover:border-white/25',
  ghost: 'text-slate-300 hover:bg-white/5 hover:text-white',
  danger: 'bg-red-600 text-white hover:bg-red-500',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={clsx(
      'inline-flex items-center justify-center rounded-md font-semibold transition-colors duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
      VARIANTS[variant],
      SIZES[size],
      className,
    )}
    {...props}
  />
);

/** Botón icono cuadrado compacto (acciones de tarjeta / header). */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  activeClass?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  active = false,
  activeClass = '',
  className,
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    aria-pressed={active}
    className={clsx(
      'inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors duration-150 focus-visible:outline-none',
      active
        ? clsx('border-transparent', activeClass)
        : 'border-white/10 bg-panel text-slate-400 hover:border-white/25 hover:text-white',
      className,
    )}
    {...props}
  />
);
