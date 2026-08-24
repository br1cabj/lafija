import type { Bet, BetCondition, BetStatus } from '../types/bet';
import { effectiveOdds, formatConditionValue } from '../types/bet';
import { formatOdds, type OddsFormat } from './odds';

/**
 * Boleto visual "LA FIJA" v2 — Canvas 2D puro.
 * Incluye: badge de estado, marcador/minuto, fecha del partido,
 * cuota efectiva con condiciones anuladas, filas Super Sub en cian
 * y wrap de selecciones largas.
 */

/** Carga el logo para dibujarlo en el canvas; null si falla (offline sin cache). */
function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = '/icons/logo.png';
  });
}

interface StatusMeta {
  label: string;
  color: string;
  bg: string;
  border: string;
}

const STATUS_META: Record<BetStatus, StatusMeta> = {
  WON: { label: 'GANADA', color: '#34D399', bg: 'rgba(16,185,129,0.16)', border: '#10B981' },
  LIVE: { label: 'EN VIVO', color: '#FF6B29', bg: 'rgba(255,85,0,0.14)', border: '#FF5500' },
  LOST: { label: 'PERDIDA', color: '#F87171', bg: 'rgba(239,68,68,0.12)', border: '#EF4444' },
  PENDING: { label: 'PENDIENTE', color: '#CBD5E1', bg: 'rgba(148,163,184,0.10)', border: '#475569' },
  CASHOUT: { label: 'RETIRADA', color: '#7DD3FC', bg: 'rgba(56,189,248,0.12)', border: '#0EA5E9' },
  VOID: { label: 'ANULADA', color: '#FBBF24', bg: 'rgba(245,158,11,0.12)', border: '#F59E0B' },
};

const CYAN = '#22D3EE';

const FONT = 'system-ui, -apple-system, sans-serif';
const MONO = 'monospace';

/** Fecha corta local ("24 ago, 17:30"); null si el startTime es inválido. */
export function formatTicketDate(startTime: string): string | null {
  if (!startTime) return null;
  const d = new Date(startTime);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** Envuelve texto en hasta 2 líneas al ancho dado; recorta con "..." la segunda. */
function wrapTwoLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [''];
  for (const w of words) {
    const candidate = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${w}` : w;
    if (ctx.measureText(candidate).width <= maxWidth) {
      lines[lines.length - 1] = candidate;
    } else {
      lines.push(w);
      if (lines.length === 2) break;
    }
  }
  // Lo que no entró se resume en la segunda línea
  if (lines.length === 2 && lines[1]) {
    const consumed = (lines[0] + ' ' + lines[1]).length;
    if (consumed < text.replace(/\s+/g, ' ').trim().length) {
      while (ctx.measureText(`${lines[1]}…`).width > maxWidth && lines[1].length > 1) {
        lines[1] = lines[1].slice(0, -1);
      }
      lines[1] += '…';
    } else {
      lines.pop();
    }
  }
  return lines;
}

export async function generateSlipBlob(
  bet: Bet,
  oddsFormat: OddsFormat,
  currencySymbol: string = '$',
): Promise<{ blob: Blob; dataUrl: string }> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  const logo = await loadLogo();

  const width = 560;

  // ---- Medición previa de filas de condiciones ------------------------------
  ctx.font = `bold 13px ${FONT}`;
  const TEXT_X = 76;
  const VALUE_W = 118;
  const maxTextWidth = width - 48 - VALUE_W - TEXT_X;

  interface RowLayout {
    cond: BetCondition;
    height: number;
    lines: string[];
    isSupersub: boolean;
  }

  const rows: RowLayout[] = bet.conditions.map((cnd) => {
    const isSupersub = Boolean(cnd.supersubFrom);
    const display = cnd.selection;
    let lines: string[];
    if (isSupersub) {
      // Línea combinada: viejo tachado ➜ nuevo
      ctx.font = `bold 13px ${FONT}`;
      lines = wrapTwoLines(ctx, display, maxTextWidth);
    } else {
      ctx.font = `bold 13px ${FONT}`;
      lines = wrapTwoLines(ctx, display, maxTextWidth);
    }
    const baseH = 40;
    const extraLines = Math.max(0, lines.length - 1);
    const supersubExtra = isSupersub ? 16 : 0;
    return {
      cond: cnd,
      height: baseH + extraLines * 15 + supersubExtra,
      lines,
      isSupersub,
    };
  });

  const conditionsBoxHeight =
    36 + rows.reduce((acc, r) => acc + r.height + 6, 0);

  const headerHeight = 152; // marca + estado/marcador/fecha + liga + equipos
  const financialsHeight = 90;
  const footerHeight = 44;
  const height =
    headerHeight + conditionsBoxHeight + financialsHeight + footerHeight + 36;

  // 2x Retina Resolution
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  // 1. Background
  ctx.fillStyle = '#0E1017';
  ctx.fillRect(0, 0, width, height);

  // Neon Orange Outer Border
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#FF5500';
  ctx.strokeRect(2, 2, width - 4, height - 4);

  // 2. Brand row ---------------------------------------------------------------
  if (logo) {
    ctx.drawImage(logo, 22, 20, 38, 38);
  } else {
    ctx.fillStyle = '#FF5500';
    drawRoundedRect(ctx, 24, 22, 34, 34, 8);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('LF', 41, 45);
  }

  ctx.textAlign = 'left';
  ctx.font = `900 20px ${FONT}`;
  ctx.fillText('LA', 68, 46);
  ctx.fillStyle = '#FF5500';
  ctx.fillText('FIJA', 98, 46);

  // Bookmaker badge (auto-scaling)
  drawBadge(
    ctx,
    bet.bookmaker.toUpperCase(),
    width - 24,
    22,
    34,
    '#1A1D28',
    '#FF6600',
    '#FF5500',
  );

  // 3. Meta row: estado + marcador + fecha ------------------------------------
  const metaY = 68;
  const meta = STATUS_META[bet.status];

  // Pill de estado (izquierda, auto-scaling)
  const statusLabel = meta.label;
  ctx.font = `900 12px ${FONT}`;
  const statusW = ctx.measureText(statusLabel).width + 28;
  ctx.fillStyle = meta.bg;
  drawRoundedRect(ctx, 24, metaY, statusW, 28, 8);
  ctx.fill();
  ctx.strokeStyle = meta.border;
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, 24, metaY, statusW, 28, 8);
  ctx.stroke();
  ctx.fillStyle = meta.color;
  ctx.textAlign = 'left';
  ctx.fillText(statusLabel, 38, metaY + 19);

  // Marcador + minuto (centro) cuando hay partido en juego/terminado
  const showScore =
    (bet.match.status === 'LIVE' || bet.match.status === 'FINISHED') &&
    Number.isFinite(bet.match.homeScore) &&
    Number.isFinite(bet.match.awayScore);
  if (showScore) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 18px ${MONO}`;
    const scoreText = `${bet.match.homeScore} - ${bet.match.awayScore}`;
    ctx.fillText(scoreText, width / 2, metaY + 21);
    if (bet.match.minute) {
      ctx.fillStyle = '#FF9900';
      ctx.font = `bold 11px ${MONO}`;
      ctx.textAlign = 'left';
      ctx.fillText(bet.match.minute, width / 2 + 42, metaY + 20);
    }
  }

  // Fecha del partido (derecha)
  const dateText = formatTicketDate(bet.match.startTime);
  if (dateText) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748B';
    ctx.font = `bold 11px ${FONT}`;
    ctx.fillText(dateText.toUpperCase(), width - 24, metaY + 18);
  }

  // 4. Liga + tipo --------------------------------------------------------------
  const betTypeLabel =
    bet.type === 'bet_builder'
      ? 'BET BUILDER'
      : bet.type === 'single'
        ? 'APUESTA SIMPLE'
        : 'COMBINADA';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8';
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillText(`${bet.league.toUpperCase()} • ${betTypeLabel}`, 24, 122);

  // Teams Title (Dynamic font-size scaling)
  const teamsText = `${bet.match.homeTeam} vs ${bet.match.awayTeam}`;
  let fontSize = 22;
  ctx.font = `900 ${fontSize}px ${FONT}`;
  while (ctx.measureText(teamsText).width > width - 48 && fontSize > 14) {
    fontSize -= 1;
    ctx.font = `900 ${fontSize}px ${FONT}`;
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(teamsText, 24, 146);

  // 5. Conditions List Container -----------------------------------------------
  const condY = 160;
  ctx.fillStyle = '#08090E';
  drawRoundedRect(ctx, 24, condY, width - 48, conditionsBoxHeight, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, 24, condY, width - 48, conditionsBoxHeight, 12);
  ctx.stroke();

  // Contador sobre condiciones activas (las anuladas no cuentan)
  const activeConds = bet.conditions.filter((c) => c.status !== 'VOID');
  const metCount = activeConds.filter((c) => c.status === 'MET').length;
  ctx.fillStyle = '#64748B';
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillText('CONDICIONES DE LA APUESTA', 38, condY + 24);

  ctx.textAlign = 'right';
  const allVoid = activeConds.length === 0;
  ctx.fillStyle = allVoid
    ? '#FBBF24'
    : metCount === activeConds.length
      ? '#10B981'
      : '#FF9900';
  ctx.font = `900 12px ${FONT}`;
  ctx.fillText(
    allVoid ? 'ANULADAS' : `${metCount}/${activeConds.length} CUMPLIDAS`,
    width - 38,
    condY + 24,
  );

  // Condition Rows
  let rowY = condY + 36;
  for (const row of rows) {
    const { cond, height: rh, lines, isSupersub } = row;
    const isMet = cond.status === 'MET';
    const isVoidCond = cond.status === 'VOID';
    const isClutch = cond.status === 'CLUTCH_DANGER';
    const isBusted = cond.status === 'BUSTED';

    // Row Background Pill
    ctx.fillStyle = isVoidCond
      ? 'rgba(245, 158, 11, 0.08)'
      : isMet
        ? 'rgba(16, 185, 129, 0.14)'
        : isBusted
          ? 'rgba(239, 68, 68, 0.10)'
          : 'rgba(255, 255, 255, 0.04)';
    drawRoundedRect(ctx, 36, rowY, width - 72, rh, 8);
    ctx.fill();

    ctx.strokeStyle = isVoidCond
      ? 'rgba(245, 158, 11, 0.35)'
      : isSupersub
        ? 'rgba(34, 211, 238, 0.35)'
        : isMet
          ? 'rgba(16, 185, 129, 0.4)'
          : isBusted
            ? 'rgba(239, 68, 68, 0.35)'
            : 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 36, rowY, width - 72, rh, 8);
    ctx.stroke();

    // Status Icon
    ctx.textAlign = 'left';
    ctx.fillStyle = isVoidCond
      ? '#FBBF24'
      : isMet
        ? '#10B981'
        : isBusted
          ? '#EF4444'
          : isClutch
            ? '#F59E0B'
            : isSupersub
              ? CYAN
              : '#64748B';
    ctx.font = `bold 15px ${FONT}`;
    const icon = isVoidCond ? '✕' : isMet ? '✓' : isBusted ? '✗' : '○';
    ctx.fillText(icon, 48, rowY + 23);

    // Selection text (con Super Sub: viejo tachado ➜ nuevo en cian)
    const firstLineY = rowY + 23;
    if (isSupersub && cond.supersubFrom) {
      const oldText = cond.supersubFrom;
      const arrow = '  ➜  ';
      ctx.font = `600 11px ${FONT}`;
      const oldW = ctx.measureText(oldText).width;
      ctx.font = `bold 13px ${FONT}`;
      const arrowW = ctx.measureText(arrow).width;
      const availNew = maxTextWidth - oldW - arrowW;

      ctx.font = `600 11px ${FONT}`;
      ctx.fillStyle = '#64748B';
      const oldShown =
        truncateToWidth(ctx, oldText, Math.min(oldW, maxTextWidth * 0.5)) ??
        oldText;
      ctx.save();
      ctx.fillText(oldShown, TEXT_X, firstLineY);
      // Tachado manual
      const strikeW = ctx.measureText(oldShown).width;
      ctx.fillRect(TEXT_X, firstLineY - 4, strikeW, 1);
      ctx.restore();

      ctx.font = `bold 13px ${FONT}`;
      ctx.fillStyle = CYAN;
      const newShown = truncateToWidth(ctx, cond.selection, availNew);
      ctx.fillText(newShown ?? cond.selection, TEXT_X + strikeW + arrowW, firstLineY);

      // Pill SUPER SUB bajo la selección
      ctx.font = `900 9px ${FONT}`;
      const pillLabel = 'SUPER SUB';
      const pillW = ctx.measureText(pillLabel).width + 12;
      const pillY = firstLineY + 7;
      ctx.fillStyle = 'rgba(34, 211, 238, 0.12)';
      drawRoundedRect(ctx, TEXT_X, pillY, pillW, 14, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
      drawRoundedRect(ctx, TEXT_X, pillY, pillW, 14, 4);
      ctx.stroke();
      ctx.fillStyle = CYAN;
      ctx.fillText(pillLabel, TEXT_X + 6, pillY + 11);
    } else {
      ctx.fillStyle = isVoidCond
        ? '#94A3B8'
        : isMet
          ? '#ECFDF5'
          : isBusted
            ? '#FCA5A5'
            : isClutch
              ? '#FCD34D'
              : '#F1F5F9';
      ctx.font = `bold 13px ${FONT}`;
      const line = lines[0];
      ctx.fillText(line, TEXT_X, firstLineY);
      // Líneas adicionales (wrap)
      if (lines[1]) {
        ctx.fillStyle = isVoidCond ? '#94A3B8' : '#CBD5E1';
        ctx.fillText(lines[1], TEXT_X, firstLineY + 16);
      }
      if (isVoidCond) {
        // Tachado sutil sobre la primera línea
        ctx.save();
        ctx.globalAlpha = 0.5;
        const w = Math.min(
          ctx.measureText(line).width,
          width - 48 - VALUE_W - TEXT_X,
        );
        ctx.fillRect(TEXT_X, firstLineY - 4, w, 1);
        ctx.restore();
      }
    }

    // Progress Value (Right side) o ANULADA
    ctx.textAlign = 'right';
    if (isVoidCond) {
      ctx.fillStyle = '#FBBF24';
      ctx.font = `bold 10px ${FONT}`;
      ctx.fillText('ANULADA · CUOTA 1.0', width - 48, rowY + 23);
    } else {
      ctx.fillStyle = isMet
        ? '#10B981'
        : isBusted
          ? '#EF4444'
          : isClutch
            ? '#F59E0B'
            : '#FF9900';
      ctx.font = `bold 13px ${MONO}`;
      ctx.fillText(formatConditionValue(cond), width - 48, rowY + 23);
    }

    rowY += rh + 6;
  }

  // 6. Big Financials Banner (Stake, Cuota, Retorno) ----------------------------
  const finY = condY + conditionsBoxHeight + 14;
  ctx.fillStyle = '#06070A';
  drawRoundedRect(ctx, 24, finY, width - 48, financialsHeight, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 85, 0, 0.3)';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, 24, finY, width - 48, financialsHeight, 12);
  ctx.stroke();

  const colW = (width - 48) / 3;

  // Cuota efectiva cuando hay anuladas (la original engañaría)
  const hasVoid = bet.conditions.some((c) => c.status === 'VOID');
  const shownOdds = hasVoid ? effectiveOdds(bet) : bet.odds;
  const shownPayout = hasVoid
    ? Math.round(bet.stake * shownOdds * 100) / 100
    : bet.potentialPayout;

  // Col 1: Stake
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillText('STAKE', 24 + colW * 0.5, finY + 30);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 20px ${MONO}`;
  ctx.fillText(`${currencySymbol}${bet.stake.toFixed(2)}`, 24 + colW * 0.5, finY + 62);

  // Col 2: Cuota
  ctx.fillStyle = '#64748B';
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillText(
    hasVoid ? 'CUOTA EFECTIVA*' : `CUOTA (${oddsFormat.toUpperCase()})`,
    24 + colW * 1.5,
    finY + 30,
  );
  ctx.fillStyle = '#FF5500';
  ctx.font = `900 24px ${MONO}`;
  ctx.fillText(formatOdds(shownOdds, oddsFormat), 24 + colW * 1.5, finY + 62);

  // Col 3: Retorno Potencial
  ctx.fillStyle = '#64748B';
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillText(hasVoid ? 'RETORNO AJUSTADO*' : 'RETORNO', 24 + colW * 2.5, finY + 30);
  ctx.fillStyle = '#10B981';
  ctx.font = `900 24px ${MONO}`;
  ctx.fillText(
    `${currencySymbol}${shownPayout.toFixed(2)}`,
    24 + colW * 2.5,
    finY + 62,
  );

  // Nota al pie del banner si hubo ajuste por anuladas
  if (hasVoid) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = `500 9px ${FONT}`;
    ctx.fillText(
      '* ajustado por condiciones anuladas (regla de las casas)',
      width / 2,
      finY + financialsHeight - 8,
    );
  }

  // 7. Watermark Footer
  const footY = finY + financialsHeight + 24;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillText('VERIFICADO POR LA FIJA', 24, footY);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FF5500';
  ctx.font = `900 11px ${FONT}`;
  ctx.fillText('LAFIJA.BET', width - 24, footY);

  // Output as Blob
  return new Promise<{ blob: Blob; dataUrl: string }>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create canvas blob'));
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      resolve({ blob, dataUrl });
    }, 'image/png');
  });
}

/** Recorta un string al ancho máximo medido; null si entra vacío. */
function truncateToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string | null {
  if (maxWidth <= 0) return null;
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

/** Badge genérico alineado a la derecha con auto-scaling del texto. */
function drawBadge(
  ctx: CanvasRenderingContext2D,
  label: string,
  rightX: number,
  y: number,
  h: number,
  bg: string,
  fg: string,
  border: string,
): void {
  const MAX_W = 170;
  let fontSize = 13;
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
  while (
    ctx.measureText(label).width + 24 > MAX_W &&
    fontSize > 9
  ) {
    fontSize -= 1;
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
  }
  let textW = ctx.measureText(label).width;
  if (textW > MAX_W - 24) {
    label = `${label.slice(0, 14)}…`;
    textW = ctx.measureText(label).width;
  }
  const w = textW + 24;
  ctx.fillStyle = bg;
  drawRoundedRect(ctx, rightX - w, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, rightX - w, y, w, h, 8);
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.fillText(label, rightX - w / 2, y + h / 2 + 4.5);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
