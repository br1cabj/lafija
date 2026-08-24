import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { applyServiceWorkerUpdate, SW_UPDATE_EVENT } from '../utils/pwa';

/**
 * Toast discreto: aparece cuando el service worker detecta un deploy nuevo
 * y ofrece recargar para activar la versión actualizada.
 */
export const PWAUpdateToast: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onUpdate = () => setVisible(true);
    window.addEventListener(SW_UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(SW_UPDATE_EVENT, onUpdate);
  }, []);

  if (!visible) return null;

  return (
    <div
      role='status'
      className='fixed bottom-24 right-4 z-50 flex items-center gap-3 rounded-lg border border-white/15 bg-elevated py-2.5 pl-4 pr-2.5 shadow-2xl md:bottom-6'
    >
      <span className='text-xs text-slate-300'>Nueva versión disponible</span>
      <button
        onClick={applyServiceWorkerUpdate}
        className='flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-hover'
      >
        <RefreshCw className='h-3.5 w-3.5' />
        Recargar
      </button>
      <button
        onClick={() => setVisible(false)}
        aria-label='Descartar aviso de actualización'
        className='p-1 text-slate-500 transition-colors hover:text-white'
      >
        <X className='h-4 w-4' />
      </button>
    </div>
  );
};
