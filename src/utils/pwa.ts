/** Evento disparado cuando hay una versión nueva lista (SW instalado en espera). */
export const SW_UPDATE_EVENT = 'lafija:sw-update';

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!window.isSecureContext && window.location.hostname !== 'localhost') return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Deploy nuevo detectado: el SW instalado espera activación mientras
        // el viejo controla la página. Avisamos para ofrecer recargar.
        registration.addEventListener('updatefound', () => {
          const next = registration.installing;
          if (!next) return;
          next.addEventListener('statechange', () => {
            if (
              next.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              window.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT));
            }
          });
        });
      })
      .catch((err) => {
        console.warn('No se pudo registrar el service worker:', err);
      });
  });
}

/** Activa el SW en espera y recarga la página con la versión nueva. */
export function applyServiceWorkerUpdate(): void {
  if (!('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.getRegistration().then((registration) => {
    const waiting = registration?.waiting;
    if (waiting) {
      waiting.addEventListener('statechange', (e) => {
        if ((e.target as ServiceWorker).state === 'activated') {
          window.location.reload();
        }
      });
      waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  });
}
