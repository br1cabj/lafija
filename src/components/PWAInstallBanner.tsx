import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
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
      alert(
        'Para instalar en iOS: Pulsa el botón Compartir de Safari y selecciona "Añadir a pantalla de inicio". En Android: Menú de Chrome > "Instalar aplicación".',
      );
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
    <div className='md:hidden bg-linear-to-r from-orange-950/80 via-[#181B26] to-surface border-b border-orange-500/30 px-4 py-2.5'>
      <div className='max-w-7xl mx-auto flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2.5'>
          <div className='p-1.5 rounded bg-brand text-white'>
            <Smartphone className='w-4 h-4' />
          </div>
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
            className='flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase px-3 py-1.5 rounded shadow active:scale-95 transition-all'
          >
            <Download className='w-3.5 h-3.5' />
            <span>Instalar App</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            aria-label='Cerrar aviso de instalación'
            className='p-1 text-slate-400 hover:text-white'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>
    </div>
  );
};
