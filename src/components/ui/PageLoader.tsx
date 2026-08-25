import React from 'react';
import { Zap } from 'lucide-react';

/** Fallback de Suspense centrado: nunca dejar un hueco en blanco. */
export const PageLoader: React.FC<{ label?: string }> = ({
  label = 'Cargando…',
}) => (
  <div
    role='status'
    aria-live='polite'
    className='flex min-h-24 flex-col items-center justify-center gap-2 py-8 text-slate-400'
  >
    <Zap className='h-5 w-5 animate-pulse text-brand' />
    <span className='text-xs font-medium tracking-wide'>{label}</span>
  </div>
);
