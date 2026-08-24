import React, { useState, useEffect } from 'react';
import type { Bet } from '../types/bet';
import { useBets } from '../context/BetContext';
import { generateSlipBlob } from '../utils/slipCanvas';
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

export const ShareTicketModal: React.FC<ShareTicketModalProps> = ({
  bet,
  isOpen,
  onClose,
}) => {
  const { oddsFormat, currencySymbol } = useBets();
  const [ticketState, setTicketState] = useState<{
    key: string;
    blob: Blob | null;
    dataUrl: string | null;
    error: string | null;
  }>({
    key: '',
    blob: null,
    dataUrl: null,
    error: null,
  });
  const [copiedImage, setCopiedImage] = useState(false);

  const currentKey = bet
    ? `${bet.id}-${bet.status}-${bet.stake}-${bet.odds}-${oddsFormat}-${currencySymbol}-${bet.conditions.map((c) => `${c.id}:${c.currentValue}:${c.status}`).join(';')}`
    : '';
  const isGenerating =
    isOpen &&
    Boolean(bet) &&
    ticketState.key !== currentKey &&
    !ticketState.error;
  const imageBlob = ticketState.key === currentKey ? ticketState.blob : null;
  const imageUrl = ticketState.key === currentKey ? ticketState.dataUrl : null;
  const errorMessage =
    ticketState.key === currentKey ? ticketState.error : null;

  // Generate instantaneously via pure 2D Canvas
  useEffect(() => {
    if (!isOpen || !bet) return;

    let isMounted = true;
    const ticketKey = `${bet.id}-${bet.status}-${bet.stake}-${bet.odds}-${oddsFormat}-${currencySymbol}-${bet.conditions.map((c) => `${c.id}:${c.currentValue}:${c.status}`).join(';')}`;

    generateSlipBlob(bet, oddsFormat, currencySymbol)
      .then(({ blob, dataUrl }) => {
        if (isMounted) {
          setTicketState({
            key: ticketKey,
            blob,
            dataUrl,
            error: null,
          });
        }
      })
      .catch((err) => {
        console.error('Error generando boleto:', err);
        if (isMounted) {
          setTicketState({
            key: ticketKey,
            blob: null,
            dataUrl: null,
            error: 'No se pudo generar la imagen.',
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, bet, oddsFormat, currencySymbol]);

  if (!isOpen || !bet) return null;

  // Direct File Download
  const handleDownload = () => {
    if (!imageUrl) return;
    const fileName = `LaFija-${bet.match.homeTeam.replace(/\s+/g, '')}-vs-${bet.match.awayTeam.replace(/\s+/g, '')}.png`;
    const link = document.createElement('a');
    link.download = fileName;
    link.href = imageUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Image to Clipboard
  const handleCopyImage = async () => {
    if (!imageBlob) return;
    try {
      if (navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ 'image/png': imageBlob }),
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
    <div className='fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto'>
      <div className='w-full max-w-sm sm:max-w-md my-4 text-slate-200'>
        {/* Header Bar */}
        <div className='flex items-center justify-between mb-2 text-xs'>
          <span className='font-mono text-orange-400 font-bold uppercase tracking-wider flex items-center gap-1.5'>
            <Sparkles className='w-4 h-4' />
            Tarjeta Oficial • La Fija
          </span>
          <button
            onClick={onClose}
            className='p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Safari / Mobile Long-Press Callout */}
        <div className='mb-2.5 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center gap-2 text-[11px] text-orange-300 font-medium'>
          <Smartphone className='w-4 h-4 text-orange-400 shrink-0' />
          <span>
            <strong>En iPhone / Safari:</strong> Mantén presionado el dedo sobre
            la tarjeta para <strong>Guardar en Fotos</strong> o compartir.
          </span>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className='mb-3 p-3 bg-red-950/50 border border-red-500/30 rounded text-xs text-red-300 flex items-center gap-2'>
            <AlertCircle className='w-4 h-4 text-red-400 shrink-0' />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Big Crisp Card Preview (Target for Long-Press / Native Save) */}
        <div className='relative shadow-2xl border-2 border-orange-500/80 bg-[#0E1017] flex items-center justify-center min-h-[300px]'>
          {isGenerating ? (
            <div className='text-center p-8'>
              <div className='w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2' />
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
            disabled={!imageUrl || isGenerating}
            className='flex items-center justify-center gap-1.5 bg-[#FF5500] hover:bg-[#FF661A] text-white text-xs font-bold uppercase py-2.5 px-3 rounded-lg shadow-lg active:scale-95 transition-all'
          >
            <Download className='w-4 h-4 shrink-0' />
            <span>Descargar</span>
          </button>

          <button
            onClick={handleCopyImage}
            disabled={!imageBlob || isGenerating}
            className='flex items-center justify-center gap-1.5 bg-[#161822] hover:bg-[#1E2230] text-slate-200 border border-white/10 text-xs font-semibold py-2.5 px-3 rounded-lg active:scale-95 transition-all'
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
      </div>
    </div>
  );
};
