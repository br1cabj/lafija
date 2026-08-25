import type { Bet } from '../types/bet';

/**
 * Exporta las apuestas a CSV (BOM UTF-8 para que Excel respete los
 * acentos). Descarga directa vía Blob; sin dependencias.
 */
export function exportBetsCsv(bets: Bet[]): void {
  const escape = (value: string | number): string => {
    const s = String(value);
    return /[",;\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };

  const header = [
    'Fecha',
    'Titulo',
    'Deporte',
    'Liga',
    'Casa',
    'Tipo',
    'Stake',
    'Cuota',
    'Estado',
    'Retorno',
    'Ganancia',
  ];

  const rows = bets.map((b) => {
    let profit = 0;
    if (b.status === 'WON') profit = b.potentialPayout - b.stake;
    else if (b.status === 'LOST') profit = -b.stake;
    else if (b.status === 'CASHOUT') profit = (b.cashoutValue ?? 0) - b.stake;
    return [
      new Date(b.createdAt).toISOString(),
      b.title,
      b.sport,
      b.league,
      b.bookmaker,
      b.type,
      b.stake,
      b.odds,
      b.status,
      b.status === 'WON' ? b.potentialPayout : (b.cashoutValue ?? ''),
      profit.toFixed(2),
    ]
      .map(escape)
      .join(';');
  });

  const csv = '\uFEFF' + [header.join(';'), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lafija-apuestas-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
