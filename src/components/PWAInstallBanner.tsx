import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        'Para instalar en iOS: Pulsa el botón Compartir de Safari y selecciona "Añadir a pantalla de inicio". En Android: Menú de Chrome > "Instalar aplicación".',
      );
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isDismissed || isInstalled) return null;

  return (
    <div className='bg-gradient-to-r from-orange-950/80 via-[#181B26] to-[#12141C] border-b border-orange-500/30 px-4 py-2.5'>
      <div className='max-w-7xl mx-auto flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2.5'>
          <div className='p-1.5 rounded bg-[#FF5500] text-white'>
            <Smartphone className='w-4 h-4' />
          </div>
          <div>
            <p className='text-xs font-bold text-white tracking-wide'>
              Instalar La Fija en tu Móvil (PWA)
            </p>
            <p className='text-[11px] text-slate-400 hidden sm:block'>
              Accede rápido como app nativa, con seguimiento offline y alertas
              en tiempo real.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={handleInstallClick}
            className='flex items-center gap-1.5 bg-[#FF5500] hover:bg-[#FF661A] text-white font-bold text-xs uppercase px-3 py-1.5 rounded shadow active:scale-95 transition-all'
          >
            <Download className='w-3.5 h-3.5' />
            <span>Instalar App</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className='p-1 text-slate-400 hover:text-white'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>
    </div>
  );
};
