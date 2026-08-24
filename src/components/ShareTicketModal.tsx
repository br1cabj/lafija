import React, { useState, useEffect, useMemo } from 'react';
import type { Bet } from '../types/bet';
import { useBets } from '../context/BetContext';
import { generateSlipBlob } from '../utils/slipCanvas';
import { ticketFilename } from '../utils/shareTicket';
import { Modal } from './ui/Modal';
import {
  X,
  Download,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  Smartphone,
} from 'lucide-react';

interface ShareTicketModalProps {
  bet: Bet | null;
  isOpen: boolean;
  onClose: () => void;
}

/** Clave que identifica el contenido exacto del boleto renderizado. */
function makeTicketKey(
  bet: Bet,
  oddsFormat: string,
  currencySymbol: string,
): string {
  return `${bet.id}-${bet.status}-${bet.stake}-${bet.odds}-${oddsFormat}-${currencySymbol}-${bet.conditions.map((c) => `${c.id}:${c.currentValue}:${c.status}`).join(';')}`;
}

interface WindowWithClipboardItem extends Window {
  ClipboardItem?: new (items: Record<string, Blob>) => ClipboardItem;
}

export const ShareTicketModal: React.FC<ShareTicketModalProps> = ({
  bet,
  isOpen,
  onClose,
}) => {
  const { oddsFormat, currencySymbol } = useBets();
  const [ticketState, setTicketState] = useState<{
    key: string;
    blob: Blob | null;
    url: string | null;
    error: string | null;
  }>({
    key: '',
    blob: null,
    url: null,
    error: null,
  });
  const [copiedImage, setCopiedImage] = useState(false);

  // El aviso de long-press solo aplica a dispositivos táctiles
  const isTouch =
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: coarse)').matches;

  const currentKey = useMemo(
    () => (bet ? makeTicketKey(bet, oddsFormat, currencySymbol) : ''),
    [bet, oddsFormat, currencySymbol],
  );

  const isGenerating =
    isOpen &&
    Boolean(bet) &&
    ticketState.key !== currentKey &&
    !ticketState.error;
  const imageBlob = ticketState.key === currentKey ? ticketState.blob : null;
  const imageUrl = ticketState.key === currentKey ? ticketState.url : null;
  const errorMessage =
    ticketState.key === currentKey ? ticketState.error : null;

  useEffect(() => {
    if (!isOpen || !bet) return;

    let isMounted = true;
    let objectUrl: string | null = null;

    generateSlipBlob(bet, oddsFormat, currencySymbol)
      .then(({ blob }) => {
        if (!isMounted) return;
        // ObjectURL en vez de base64: la mitad de memoria y render directo
        objectUrl = URL.createObjectURL(blob);
        setTicketState({
          key: makeTicketKey(bet, oddsFormat, currencySymbol),
          blob,
          url: objectUrl,
          error: null,
        });
      })
      .catch((err) => {
        console.error('Error generando boleto:', err);
        if (isMounted) {
          setTicketState({
            key: makeTicketKey(bet, oddsFormat, currencySymbol),
            blob: null,
            url: null,
            error: 'No se pudo generar la imagen.',
          });
        }
      });

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, bet, oddsFormat, currencySymbol]);

  if (!isOpen || !bet) return null;

  // Direct File Download (uses the already-generated Blob, not the base64)
  const handleDownload = () => {
    if (!imageBlob) return;
    const fileName = ticketFilename(bet);
    const url = URL.createObjectURL(imageBlob);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // Copy Image to Clipboard
  const handleCopyImage = async () => {
    if (!imageBlob) return;
    try {
      const win = window as WindowWithClipboardItem;
      if (navigator.clipboard && win.ClipboardItem) {
        await navigator.clipboard.write([
          new win.ClipboardItem({ 'image/png': imageBlob }),
        ]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel='Compartir boleto'
      maxWidthClass='max-w-sm sm:max-w-md'
      panelClassName='p-3 sm:p-4 bg-[#0E1017]'
      hideCloseButton
    >
      {/* Header Bar */}
      <div className='flex items-center justify-between mb-2 text-xs'>
        <span className='font-mono text-orange-400 font-bold uppercase tracking-wider flex items-center gap-1.5'>
          <Sparkles className='w-4 h-4' />
          Tarjeta Oficial • La Fija
        </span>
        <button
          onClick={onClose}
          aria-label='Cerrar'
          className='p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors'
        >
          <X className='w-4 h-4' />
        </button>
      </div>

      {/* Safari / Mobile Long-Press Callout (solo dispositivos táctiles) */}
      {isTouch && (
        <div className='mb-2.5 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center gap-2 text-[11px] text-orange-300 font-medium'>
          <Smartphone className='w-4 h-4 text-brand shrink-0' />
          <span>
            iPhone: mantén presionada la tarjeta para guardarla o compartirla.
          </span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className='mb-3 p-3 bg-red-950/50 border border-red-500/30 rounded text-xs text-red-300 flex items-center gap-2'>
          <AlertCircle className='w-4 h-4 text-red-400 shrink-0' />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Big Crisp Card Preview (Target for Long-Press / Native Save) */}
      <div className='relative shadow-2xl border-2 border-orange-500/80 bg-[#0E1017] flex items-center justify-center min-h-75'>
        {isGenerating ? (
          <div className='text-center p-8'>
            <div className='w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-2' />
            <p className='text-xs text-slate-400 font-mono'>
              Generando boleto oficial...
            </p>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt='Boleto Oficial La Fija'
            className='w-full h-auto block shadow-lg cursor-pointer active:scale-[0.98] transition-transform'
          />
        ) : null}
      </div>

      {/* Clean Action Buttons */}
      <div className='grid grid-cols-2 gap-2 mt-3'>
        <button
          onClick={handleDownload}
          disabled={!imageBlob || isGenerating}
          className='flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold uppercase py-2.5 px-3 rounded-lg shadow-lg active:scale-95 transition-all disabled:opacity-50'
        >
          <Download className='w-4 h-4 shrink-0' />
          <span>Descargar</span>
        </button>

        <button
          onClick={handleCopyImage}
          disabled={!imageBlob || isGenerating}
          className='flex items-center justify-center gap-1.5 bg-panel hover:bg-[#1E2230] text-slate-200 border border-white/10 text-xs font-semibold py-2.5 px-3 rounded-lg active:scale-95 transition-all disabled:opacity-50'
        >
          {copiedImage ? (
            <Check className='w-4 h-4 text-emerald-400 shrink-0' />
          ) : (
            <Copy className='w-4 h-4 shrink-0' />
          )}
          <span className='truncate'>
            {copiedImage ? '¡Copiado!' : 'Copiar Imagen'}
          </span>
        </button>
      </div>
    </Modal>
  );
};
