import type { Bet } from '../types/bet';
import { formatOdds, type OddsFormat } from './odds';

/**
 * High-Impact, Compact, Bold 2D Canvas Slip for "LA FIJA".
 * Optimized for mobile screens, high legibility and instant rendering.
 */
export async function generateSlipBlob(
  bet: Bet,
  oddsFormat: OddsFormat,
  currencySymbol: string = '$',
): Promise<{ blob: Blob; dataUrl: string }> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  const width = 560;
  const conditions = bet.conditions;
  const rowHeight = 44;
  const headerHeight = 120;
  const conditionsBoxHeight = 36 + conditions.length * rowHeight;
  const financialsHeight = 90;
  const footerHeight = 44;

  const height =
    headerHeight + conditionsBoxHeight + financialsHeight + footerHeight + 36;

  // 2x Retina Resolution
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  // 1. Background (Solid Dark Onyx Carbon - No transparent/white corners)
  ctx.fillStyle = '#0E1017';
  ctx.fillRect(0, 0, width, height);

  // Neon Orange Outer Border (Crisp Square Edge)
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#FF5500';
  ctx.strokeRect(2, 2, width - 4, height - 4);

  // 2. Top Header Brand Row
  // Orange LF Badge
  ctx.fillStyle = '#FF5500';
  drawRoundedRect(ctx, 24, 22, 34, 34, 8);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 16px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LF', 41, 45);

  // Brand Name: LA FIJA
  ctx.textAlign = 'left';
  ctx.font = '900 20px system-ui, -apple-system, sans-serif';
  ctx.fillText('LA', 68, 46);
  ctx.fillStyle = '#FF5500';
  ctx.fillText('FIJA', 98, 46);

  // Bookmaker Badge (Top Right)
  ctx.fillStyle = '#1A1D28';
  drawRoundedRect(ctx, width - 150, 22, 126, 34, 8);
  ctx.fill();
  ctx.strokeStyle = '#FF5500';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, width - 150, 22, 126, 34, 8);
  ctx.stroke();

  ctx.fillStyle = '#FF6600';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(bet.bookmaker, width - 87, 44);

  // 3. Match Header (Big & Bold)
  const betTypeLabel =
    bet.type === 'bet_builder'
      ? 'BET BUILDER'
      : bet.type === 'single'
        ? 'APUESTA SIMPLE'
        : 'COMBINADA';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${bet.league.toUpperCase()} • ${betTypeLabel}`, 24, 80);

  // Teams Title (Dynamic font-size scaling to prevent overflow)
  const teamsText = `${bet.match.homeTeam} vs ${bet.match.awayTeam}`;
  let fontSize = 22;
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
  while (ctx.measureText(teamsText).width > width - 48 && fontSize > 14) {
    fontSize -= 1;
    ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(teamsText, 24, 108);

  // 4. Conditions List Container
  const condY = 124;
  ctx.fillStyle = '#08090E';
  drawRoundedRect(ctx, 24, condY, width - 48, conditionsBoxHeight, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, 24, condY, width - 48, conditionsBoxHeight, 12);
  ctx.stroke();

  // Header inside conditions box
  const metCount = conditions.filter((c) => c.status === 'MET').length;
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText(`CONDICIONES DE LA APUESTA`, 38, condY + 24);

  ctx.textAlign = 'right';
  ctx.fillStyle = metCount === conditions.length ? '#10B981' : '#FF9900';
  ctx.font = '900 12px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    `${metCount}/${conditions.length} CUMPLIDAS`,
    width - 38,
    condY + 24,
  );

  // Conditions Rows
  conditions.forEach((cond, i) => {
    const rowY = condY + 36 + i * rowHeight;
    const isMet = cond.status === 'MET';

    // Row Background Pill
    ctx.fillStyle = isMet
      ? 'rgba(16, 185, 129, 0.14)'
      : 'rgba(255, 255, 255, 0.04)';
    drawRoundedRect(ctx, 36, rowY, width - 72, 36, 8);
    ctx.fill();

    ctx.strokeStyle = isMet
      ? 'rgba(16, 185, 129, 0.4)'
      : 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 36, rowY, width - 72, 36, 8);
    ctx.stroke();

    // Status Icon
    ctx.textAlign = 'left';
    ctx.fillStyle = isMet ? '#10B981' : '#64748B';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(isMet ? '✔' : '○', 48, rowY + 24);

    // Selection Text
    ctx.fillStyle = isMet ? '#ECFDF5' : '#F1F5F9';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    const label =
      cond.selection.length > 36
        ? cond.selection.slice(0, 34) + '...'
        : cond.selection;
    ctx.fillText(label, 72, rowY + 23);

    // Progress Value (Right side)
    ctx.textAlign = 'right';
    ctx.fillStyle = isMet ? '#10B981' : '#FF9900';
    ctx.font = 'bold 13px monospace';
    const valText =
      typeof cond.currentValue === 'number' &&
      typeof cond.targetValue === 'number'
        ? `${cond.currentValue}/${cond.targetValue}`
        : String(cond.currentValue ?? '');
    ctx.fillText(valText, width - 48, rowY + 23);
  });

  // 5. Big Financials Banner (Cuota, Stake, Retorno)
  const finY = condY + conditionsBoxHeight + 14;
  ctx.fillStyle = '#06070A';
  drawRoundedRect(ctx, 24, finY, width - 48, financialsHeight, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 85, 0, 0.3)';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, 24, finY, width - 48, financialsHeight, 12);
  ctx.stroke();

  const colW = (width - 48) / 3;

  // Col 1: Stake
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('STAKE', 24 + colW * 0.5, finY + 30);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 20px monospace';
  ctx.fillText(
    `${currencySymbol}${bet.stake.toFixed(2)}`,
    24 + colW * 0.5,
    finY + 62,
  );

  // Col 2: Cuota
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    `CUOTA (${oddsFormat.toUpperCase()})`,
    24 + colW * 1.5,
    finY + 30,
  );
  ctx.fillStyle = '#FF5500';
  ctx.font = '900 24px monospace';
  ctx.fillText(formatOdds(bet.odds, oddsFormat), 24 + colW * 1.5, finY + 62);

  // Col 3: Retorno Potencial
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('RETORNO', 24 + colW * 2.5, finY + 30);
  ctx.fillStyle = '#10B981';
  ctx.font = '900 24px monospace';
  ctx.fillText(
    `${currencySymbol}${bet.potentialPayout.toFixed(2)}`,
    24 + colW * 2.5,
    finY + 62,
  );

  // 6. Watermark Footer
  const footY = finY + financialsHeight + 24;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('🛡️ VERIFICADO POR LA FIJA PRO', 24, footY);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FF5500';
  ctx.font = '900 11px system-ui, -apple-system, sans-serif';
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
