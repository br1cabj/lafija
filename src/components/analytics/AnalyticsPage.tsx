import React, { useMemo, useState } from 'react';
import { useBets } from '../../context/BetContext';
import type { Bet } from '../../types/bet';
import { formatMoney } from '../../utils/odds';
import { exportBetsCsv } from '../../utils/csv';
import { Download } from 'lucide-react';

type Period = 7 | 30 | 90 | null;

const PERIODS: { label: string; value: Period }[] = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
  { label: 'Todo', value: null },
];

const BET_TYPE_LABELS: Record<Bet['type'], string> = {
  single: 'Simple',
  parlay: 'Parlay',
  bet_builder: 'Bet Builder',
};

/** Ganancia de una apuesta resuelta (VOID = reembolso neutro). */
function betProfit(b: Bet): number {
  if (b.status === 'WON') return b.potentialPayout - b.stake;
  if (b.status === 'LOST') return -b.stake;
  if (b.status === 'CASHOUT') return (b.cashoutValue ?? 0) - b.stake;
  return 0;
}

interface GroupRow {
  name: string;
  count: number;
  staked: number;
  profit: number;
}

function groupBy(bets: Bet[], keyFn: (b: Bet) => string): GroupRow[] {
  const map = new Map<string, GroupRow>();
  for (const b of bets) {
    const name = keyFn(b) || '—';
    const row = map.get(name) ?? {
      name,
      count: 0,
      staked: 0,
      profit: 0,
    };
    row.count += 1;
    row.staked += b.stake;
    row.profit += betProfit(b);
    map.set(name, row);
  }
  return [...map.values()].sort((a, b) => b.profit - a.profit);
}

/** Gráfico SVG de ganancia acumulada: línea + área plana, sin dependencias. */
const BankrollChart: React.FC<{ bets: Bet[] }> = ({ bets }) => {
  const settled = useMemo(
    () =>
      bets
        .filter((b) => b.status === 'WON' || b.status === 'LOST' || b.status === 'CASHOUT')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [bets],
  );

  const W = 640;
  const H = 200;
  const PAD_X = 8;
  const PAD_Y = 16;

  const { points, areaPath, final, min, max } = useMemo(() => {
    let acc = 0;
    const values = [0];
    for (const b of settled) {
      acc += betProfit(b);
      values.push(acc);
    }
    const lo = Math.min(...values, 0);
    const hi = Math.max(...values, 0);
    const span = hi - lo || 1;
    const x = (i: number) =>
      PAD_X + (i / Math.max(values.length - 1, 1)) * (W - PAD_X * 2);
    const y = (v: number) =>
      PAD_Y + (1 - (v - lo) / span) * (H - PAD_Y * 2);

    const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    const area =
      `M ${x(0)},${y(0)} ` +
      values.map((v, i) => `L ${x(i)},${y(v)}`).join(' ') +
      ` L ${x(values.length - 1)},${y(0)} Z`;
    return {
      points: pts,
      areaPath: area,
      final: values[values.length - 1],
      min: lo,
      max: hi,
    };
  }, [settled]);

  const positive = final >= 0;
  const lineColor = positive ? '#00e676' : '#ff3344';

  if (settled.length === 0) {
    return (
      <p className='py-10 text-center text-xs text-slate-500'>
        Sin apuestas resueltas en este período para graficar.
      </p>
    );
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role='img'
        aria-label='Ganancia acumulada en el período'
        className='w-full'
      >
        {/* Línea de cero */}
        <line
          x1={PAD_X}
          x2={W - PAD_X}
          y1={PAD_Y + (1 - -min / ((max - min) || 1)) * (H - PAD_Y * 2)}
          y2={PAD_Y + (1 - -min / ((max - min) || 1)) * (H - PAD_Y * 2)}
          stroke='rgba(255,255,255,0.12)'
          strokeDasharray='4 4'
          strokeWidth='1'
        />
        {/* Área bajo la curva */}
        <path d={areaPath} fill={lineColor} opacity='0.08' />
        {/* Curva */}
        <polyline
          points={points}
          fill='none'
          stroke={lineColor}
          strokeWidth='2'
          strokeLinejoin='round'
          strokeLinecap='round'
        />
        {/* Punto final */}
        {(() => {
          const n = settled.length;
          const cx = PAD_X + (n / n) * (W - PAD_X * 2);
          const cy =
            PAD_Y +
            (1 - (final - min) / ((max - min) || 1)) * (H - PAD_Y * 2);
          return (
            <g>
              <circle cx={cx} cy={cy} r='3.5' fill={lineColor} />
              <text
                x={cx - 6}
                y={cy - 9}
                textAnchor='end'
                fontSize='11'
                fontWeight='700'
                fill={lineColor}
              >
                {positive ? '+' : ''}
                {final.toFixed(2)}
              </text>
            </g>
          );
        })()}
      </svg>
      <div className='font-mono-numbers mt-1 flex justify-between text-[10px] text-slate-500'>
        <span>{settled[0] && new Date(settled[0].createdAt).toLocaleDateString('es-AR')}</span>
        <span>
          mín {min.toFixed(2)} · máx +{max.toFixed(2)}
        </span>
        <span>{new Date().toLocaleDateString('es-AR')}</span>
      </div>
    </div>
  );
};

/** Fila de breakdown con barra proporcional al |P&L|. */
const BreakdownBlock: React.FC<{ title: string; rows: GroupRow[] }> = ({
  title,
  rows,
}) => {
  if (rows.length === 0) return null;
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.profit)), 1);

  return (
    <section className='panel-card rounded-lg p-4'>
      <h3 className='mb-3 border-b border-white/10 pb-2 text-sm font-semibold text-white'>
        {title}
      </h3>
      <div className='space-y-2'>
        {rows.slice(0, 8).map((r) => {
          const roi = r.staked > 0 ? (r.profit / r.staked) * 100 : 0;
          const pct = (Math.abs(r.profit) / maxAbs) * 100;
          const pos = r.profit >= 0;
          return (
            <div key={r.name}>
              <div className='flex items-baseline justify-between gap-2 text-xs'>
                <span className='min-w-0 truncate font-medium text-slate-200'>
                  {r.name}
                  <span className='ml-1.5 text-[10px] font-normal text-slate-500'>
                    {r.count} {r.count === 1 ? 'apuesta' : 'apuestas'}
                  </span>
                </span>
                <span className='font-mono-numbers shrink-0 font-semibold'>
                  <span className={pos ? 'text-won' : 'text-lost'}>
                    {pos ? '+' : '-'}
                    {formatMoney(Math.abs(r.profit), '$')}
                  </span>
                  <span
                    className={`ml-2 ${roi >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}`}
                  >
                    ROI {roi >= 0 ? '+' : ''}
                    {roi.toFixed(1)}%
                  </span>
                </span>
              </div>
              <div className='mt-1 h-1 overflow-hidden rounded-full bg-white/5'>
                <div
                  className={`h-full rounded-full ${pos ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.max(pct, 2)}%`, opacity: 0.75 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const AnalyticsPage: React.FC = () => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nowMs = Date.now();
  const { bets, currencySymbol } = useBets();
  const [period, setPeriod] = useState<Period>(30);

  const settled = useMemo(() => {
    const cutoff =
      period === null
        ? 0
        : nowMs - period * 24 * 60 * 60 * 1000;
    return bets.filter(
      (b) =>
        (b.status === 'WON' ||
          b.status === 'LOST' ||
          b.status === 'CASHOUT') &&
        new Date(b.createdAt).getTime() >= cutoff,
    );
  }, [bets, period, nowMs]);

  const kpi = useMemo(() => {
    const staked = settled.reduce((a, b) => a + b.stake, 0);
    const profit = settled.reduce((a, b) => a + betProfit(b), 0);
    const won = settled.filter((b) => b.status === 'WON').length;
    return {
      staked,
      profit,
      roi: staked > 0 ? (profit / staked) * 100 : 0,
      winRate: settled.length > 0 ? (won / settled.length) * 100 : 0,
      won,
      count: settled.length,
    };
  }, [settled]);

  const byBook = useMemo(() => groupBy(settled, (b) => b.bookmaker), [settled]);
  const byType = useMemo(
    () => groupBy(settled, (b) => BET_TYPE_LABELS[b.type]),
    [settled],
  );
  const byLeague = useMemo(() => groupBy(settled, (b) => b.league), [settled]);

  return (
    <div className='space-y-5'>
      {/* Cabecera: título + período + export */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-lg font-semibold tracking-tight text-white'>
          Panel de análisis
        </h2>
        <div className='flex items-center gap-2'>
          <div
            role='tablist'
            aria-label='Período'
            className='flex items-center rounded-md border border-white/10 bg-panel p-0.5'
          >
            {PERIODS.map(({ label, value }) => (
              <button
                key={label}
                role='tab'
                aria-selected={period === value}
                onClick={() => setPeriod(value)}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                  period === value
                    ? 'bg-brand text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type='button'
            onClick={() => exportBetsCsv(bets)}
            aria-label='Exportar apuestas a CSV'
            title='Exportar todas las apuestas a CSV (Excel)'
            className='inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-panel px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-white/25 hover:text-white'
          >
            <Download className='h-3.5 w-3.5' />
            CSV
          </button>
        </div>
      </div>

      {/* KPIs del período */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-5'>
        {[
          {
            label: 'P&L',
            node: (
              <span
                className={`font-mono-numbers text-lg font-bold ${kpi.profit >= 0 ? 'text-won' : 'text-lost'}`}
              >
                {kpi.profit >= 0 ? '+' : '-'}
                {formatMoney(Math.abs(kpi.profit), currencySymbol)}
              </span>
            ),
          },
          {
            label: 'ROI',
            node: (
              <span
                className={`font-mono-numbers text-lg font-bold ${kpi.roi >= 0 ? 'text-won' : 'text-lost'}`}
              >
                {kpi.roi >= 0 ? '+' : ''}
                {kpi.roi.toFixed(1)}%
              </span>
            ),
          },
          {
            label: 'Win rate',
            node: (
              <span className='font-mono-numbers text-lg font-bold text-white'>
                {kpi.winRate.toFixed(0)}%
              </span>
            ),
          },
          {
            label: 'Apostado',
            node: (
              <span className='font-mono-numbers text-lg font-bold text-white'>
                {formatMoney(kpi.staked, currencySymbol)}
              </span>
            ),
          },
          {
            label: 'Resueltas',
            node: (
              <span className='font-mono-numbers text-lg font-bold text-white'>
                {kpi.count}
                <span className='ml-1 text-xs font-normal text-slate-400'>
                  · {kpi.won} ganadas
                </span>
              </span>
            ),
          },
        ].map(({ label, node }) => (
          <div
            key={label}
            className='panel-card rounded-lg px-4 py-3'
          >
            <span className='mb-0.5 block text-[11px] font-medium tracking-wide text-slate-400 uppercase'>
              {label}
            </span>
            {node}
          </div>
        ))}
      </div>

      {/* Gráfico de bankroll acumulado */}
      <section className='panel-card rounded-lg p-4'>
        <h3 className='mb-3 border-b border-white/10 pb-2 text-sm font-semibold text-white'>
          Ganancia acumulada
        </h3>
        <BankrollChart bets={settled} />
      </section>

      {/* Breakdowns */}
      {settled.length > 0 && (
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
          <BreakdownBlock title='Por casa de apuestas' rows={byBook} />
          <BreakdownBlock title='Por tipo de boleta' rows={byType} />
          <BreakdownBlock title='Por liga' rows={byLeague} />
        </div>
      )}

      {settled.length === 0 && (
        <div className='rounded-lg border border-dashed border-white/10 bg-surface p-10 text-center'>
          <h3 className='mb-1 text-sm font-semibold text-white'>
            Sin datos en este período
          </h3>
          <p className='mx-auto max-w-xs text-xs text-slate-400'>
            Cuando asientes apuestas (ganadas, perdidas o retiradas) van a
            aparecer acá con su curva y desgloses.
          </p>
        </div>
      )}
    </div>
  );
};
