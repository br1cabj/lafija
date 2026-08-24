import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showManualHelp, setShowManualHelp] = useState(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(display-mode: standalone)').matches
    );
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => setIsInstalled(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Sin beforeinstallprompt (típico en iOS): mostramos instrucciones manuales
      setShowManualHelp(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (err) {
      console.error('Error al solicitar instalación PWA:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  if (isDismissed || isInstalled) return null;

  return (
    <div className='border-b border-orange-500/30 bg-linear-to-r from-orange-950/80 via-[#181B26] to-surface px-4 py-2.5 md:hidden'>
      <div className='mx-auto flex max-w-7xl items-center justify-between gap-3'>
        <div className='flex items-center gap-2.5'>
          <img
            src='/icons/logo.png'
            alt='LA FIJA'
            className='h-8 w-8 rounded-md object-contain'
            draggable={false}
          />
          <div>
            <p className='text-xs font-bold text-white tracking-wide'>
              Instalar La Fija en tu Móvil (PWA)
            </p>
            <p className='text-[11px] text-slate-400 hidden sm:block'>
              Rápido como app nativa, con seguimiento offline.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={handleInstallClick}
            className='flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-hover'
          >
            <Download className='h-3.5 w-3.5' />
            <span>Instalar app</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            aria-label='Cerrar aviso de instalación'
            className='p-1 text-slate-400 transition-colors hover:text-white'
          >
            <X className='h-4 w-4' />
          </button>
        </div>
      </div>

      {/* Instrucciones manuales (iOS Safari no dispara beforeinstallprompt) */}
      {showManualHelp && (
        <div className='mx-auto mt-2.5 max-w-7xl rounded-md border border-white/10 bg-base/80 px-3 py-2.5 text-[11px] leading-relaxed text-slate-300'>
          <p className='mb-1 font-semibold text-white'>Cómo instalar:</p>
          <p>
            <span className='font-semibold text-orange-400'>iPhone/iPad:</span>{' '}
            botón Compartir de Safari → «Añadir a pantalla de inicio».
          </p>
          <p>
            <span className='font-semibold text-orange-400'>Android:</span> menú
            ⋮ de Chrome → «Instalar aplicación».
          </p>
        </div>
      )}
    </div>
  );
};
