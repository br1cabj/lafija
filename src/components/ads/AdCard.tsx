import React from 'react';
import { ACTIVE_AD, type AdCampaign } from '../../config/ads';
import { ExternalLink } from 'lucide-react';

interface AdCardProps {
  /** compact = sidebar; native = tarjeta del feed (fase 2) */
  variant?: 'compact' | 'native';
}

/**
 * Tarjeta publicitaria de afiliado. Sin scripts externos ni cookies:
 * es un enlace directo con rel="sponsored".
 */
export const AdCard: React.FC<AdCardProps> = ({ variant = 'compact' }) => {
  const ad: AdCampaign = ACTIVE_AD;

  if (variant === 'compact') {
    return (
      <a
        href={ad.ctaUrl}
        target='_blank'
        // sponsored: marca el enlace como publicitario (requisito de Google)
        rel='sponsored noopener noreferrer'
        className='block rounded-lg border border-white/10 bg-surface p-4 transition-colors hover:border-white/25'
      >
        <div className='mb-2 flex items-center justify-between'>
          <span className='text-[10px] font-semibold tracking-wider text-slate-500 uppercase'>
            Publicidad
          </span>
          <span className='text-[10px] font-semibold tracking-wide text-slate-400 uppercase'>
            {ad.bookmaker}
          </span>
        </div>

        <p className='text-sm font-semibold text-white'>{ad.headline}</p>
        <p className='mt-1 text-xs leading-relaxed text-slate-400'>
          {ad.description}
        </p>

        <span className='mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white'>
          {ad.ctaLabel}
          <ExternalLink className='h-3 w-3' />
        </span>

        <p className='mt-2.5 text-[10px] text-slate-500'>
          18+ · Jugá responsablemente
        </p>
      </a>
    );
  }

  // Variante native: tarjeta del feed (misma silueta que BetCard)
  return (
    <div className='relative mb-3 rounded-lg border border-dashed border-white/15 bg-surface/60 p-4 lg:p-5'>
      <div className='mb-3 flex items-center justify-between'>
        <span className='rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-400'>
          Publicidad · {ad.bookmaker}
        </span>
        <span className='text-[10px] text-slate-500'>18+</span>
      </div>

      <a
        href={ad.ctaUrl}
        target='_blank'
        rel='sponsored noopener noreferrer'
        className='group block'
      >
        <h3 className='text-base font-semibold text-white'>{ad.headline}</h3>
        <p className='mt-1 text-sm text-slate-400'>{ad.description}</p>
        <span className='mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand group-hover:text-brand-hover'>
          {ad.ctaLabel}
          <ExternalLink className='h-3 w-3' />
        </span>
      </a>

      <p className='mt-3 border-t border-white/5 pt-2.5 text-[10px] text-slate-500'>
        Jugá responsablemente. Si el juego deja de ser un juego, pedí ayuda.
      </p>
    </div>
  );
};
