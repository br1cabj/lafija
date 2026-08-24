import type { Bet, BetStatus } from '../types/bet';
import { generateSlipBlob } from './slipCanvas';
import type { OddsFormat } from './odds';

/**
 * Compartir boletos: caption según estado, nombre de archivo y share nativo
 * del SO (Web Share API Level 2) con fallback al modal en desktop.
 */

const STATUS_FILE_TAG: Record<BetStatus, string> = {
  WON: 'GANADA',
  LIVE: 'EN-VIVO',
  PENDING: 'PENDIENTE',
  LOST: 'PERDIDA',
  CASHOUT: 'RETIRADA',
  VOID: 'ANULADA',
};

/** Texto acompañante al compartir, según el estado del boleto. */
export function ticketCaption(bet: Bet): string {
  switch (bet.status) {
    case 'WON':
      return '🏆 ¡Boleto GANADOR con LA FIJA!';
    case 'LIVE':
      return '🔴 Lo sigo EN VIVO con LA FIJA';
    case 'PENDING':
      return '🎯 El ticket de hoy con LA FIJA';
    case 'CASHOUT':
      return '💰 Retirado a tiempo con LA FIJA';
    case 'VOID':
      return '↩️ Anulado y reembolsado — LA FIJA';
    case 'LOST':
      return 'La próxima cae 💪 LA FIJA';
  }
}

/** Nombre de archivo legible: LaFija-BocaJuniors-vs-RiverPlate-GANADA.png */
export function ticketFilename(bet: Bet): string {
  const teams = `${bet.match.homeTeam}-vs-${bet.match.awayTeam}`
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9-]/g, '');
  return `LaFija-${teams}-${STATUS_FILE_TAG[bet.status]}.png`;
}

/** true si el navegador puede compartir archivos vía sheet nativo. */
export function canNativeShareFiles(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
  };
  if (typeof nav.canShare !== 'function' || typeof nav.share !== 'function') {
    return false;
  }
  try {
    const probe = new File([new Blob(['x'])], 'probe.png', { type: 'image/png' });
    return nav.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Intenta abrir el panel de compartir nativo del SO con el PNG + caption.
 * Devuelve:
 *  - 'shared'   -> el usuario compartió (o cerró el sheet: AbortError)
 *  - 'unsupported' -> no hay soporte; el caller debe abrir el modal
 *  - 'error'    -> fallo real (canvas/permiso); el caller decide
 */
export async function tryNativeShare(
  bet: Bet,
  oddsFormat: OddsFormat,
  currencySymbol: string,
): Promise<'shared' | 'unsupported' | 'error'> {
  if (!canNativeShareFiles()) return 'unsupported';

  try {
    const { blob } = await generateSlipBlob(bet, oddsFormat, currencySymbol);
    const file = new File([blob], ticketFilename(bet), { type: 'image/png' });
    await navigator.share({
      files: [file],
      text: ticketCaption(bet),
      title: 'LA FIJA',
    });
    // AbortError (usuario cerró el sheet) también cuenta como manejado
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return 'shared';
    }
    if (err instanceof TypeError) {
      // Algunos navegadores lanzan TypeError si canShare miente con files
      return 'unsupported';
    }
    console.warn('Error en share nativo:', err);
    return 'error';
  }
}
