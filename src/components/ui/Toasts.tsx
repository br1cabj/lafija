import React, { useSyncExternalStore } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import {
  getToasts,
  subscribeToasts,
  type ToastItem,
} from '../../utils/toastBus';

/**
 * Viewport de toasts: se monta UNA vez en App. Para emitir notificaciones
 * desde cualquier lado (sin hooks): `toast.success('…')` de utils/toastBus.
 */

const KIND_STYLES: Record<
  ToastItem['kind'],
  { cls: string; Icon: React.FC<{ className?: string }> }
> = {
  success: {
    cls: 'border-emerald-500/40 bg-emerald-950/80 text-emerald-200',
    Icon: CheckCircle2,
  },
  error: {
    cls: 'border-red-500/40 bg-red-950/80 text-red-200',
    Icon: AlertCircle,
  },
  info: { cls: 'border-white/15 bg-panel/95 text-slate-200', Icon: Info },
};

export const ToastViewport: React.FC = () => {
  const items = useSyncExternalStore(subscribeToasts, getToasts);
  return (
    <div
      aria-live='polite'
      aria-atomic='false'
      className='pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-1.5 px-4 md:left-auto md:right-4 md:top-16 md:bottom-auto md:items-end md:px-0'
    >
      {items.map((t) => {
        const { cls, Icon } = KIND_STYLES[t.kind];
        return (
          <div
            key={t.id}
            className={`animate-toast-in pointer-events-auto flex max-w-sm items-center gap-2 rounded-md border px-3.5 py-2.5 text-xs font-medium shadow-xl backdrop-blur-md ${cls}`}
          >
            <Icon className='h-4 w-4 shrink-0' />
            <span>{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
};
