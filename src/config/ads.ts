/**
 * Configuración de publicidad (afiliados directos, sin scripts ni cookies).
 *
 * ADS_ENABLED controla si se muestran los espacios publicitarios.
 * Dejarlo en false hasta tener el enlace de afiliado definitivo:
 * todo el layout ya está implementado pero permanece invisible.
 */
export const ADS_ENABLED = false;

export interface AdCampaign {
  /** Nombre del bookmaker anunciante */
  bookmaker: string;
  headline: string;
  description: string;
  ctaLabel: string;
  /** Enlace de afiliado con tracking. Reemplazar antes de activar ADS_ENABLED. */
  ctaUrl: string;
}

/** Campaña activa — placeholder hasta cargar el link de afiliado real. */
export const ACTIVE_AD: AdCampaign = {
  bookmaker: 'Betsson',
  headline: 'Bonificación de bienvenida',
  description: 'Apuesta sin riesgo para nuevos usuarios en tu primera apuesta.',
  ctaLabel: 'Ver oferta',
  ctaUrl: 'https://www.ejemplo.com/afiliado?ref=lafija',
};
