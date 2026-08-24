import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Captura errores de render y muestra una pantalla de recuperación en lugar
 * de una página en blanco. Envuelve toda la app en main.tsx/App.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error en la aplicación:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='flex min-h-screen flex-col items-center justify-center gap-4 bg-base px-6 text-center text-slate-300'>
          <img
            src='/icons/logo.png'
            alt='LA FIJA'
            className='h-16 w-16 object-contain opacity-80'
            draggable={false}
          />
          <div>
            <h1 className='text-lg font-semibold text-white'>Algo salió mal</h1>
            <p className='mt-1 max-w-sm text-sm text-slate-400'>
              Ocurrió un error inesperado. Tus datos están guardados en este
              dispositivo.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className='rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover'
          >
            Recargar la app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
