/**
 * Helpers compartidos por los endpoints serverless de Vercel (Node).
 * Única fuente de verdad para el guardián de cuota de API-Football,
 * respuestas JSON con edge cache y el guard de método HTTP.
 *
 * OJO: cada función serverless corre en su propio aislado — el contador
 * de cuota es por instancia (cap blando, no contabilidad global exacta).
 */

export interface ApiRes {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body: string): void;
}

export interface ApiReq {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

// ---- Clave de API-Sports ----------------------------------------------------

export function getApiKey(): string | null {
  const key = process.env.SPORTS_API_KEY;
  return key && key.trim() !== '' ? key.trim() : null;
}

// ---- Guardian de cuota diaria para API-Football -----------------------------

export const DAILY_QUOTA_LIMIT = 80;
let quotaDate = '';
let quotaCount = 0;

function rollQuotaDayIfNeeded(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (quotaDate !== today) {
    quotaDate = today;
    quotaCount = 0;
  }
}

export function quotaAvailable(): boolean {
  rollQuotaDayIfNeeded();
  return quotaCount < DAILY_QUOTA_LIMIT;
}

/** Consume 1 unidad y loguea con la etiqueta del endpoint. */
export function consumeQuota(endpointLabel: string): void {
  rollQuotaDayIfNeeded();
  quotaCount += 1;
  console.warn(
    `[${endpointLabel}] cuota API-Football: ${quotaCount}/${DAILY_QUOTA_LIMIT} hoy`,
  );
}

// ---- Respuestas --------------------------------------------------------------

/**
 * JSON con edge cache de Vercel: las repetidas las sirve el edge sin
 * invocar la función -> protege la cuota del polling del cliente.
 */
export function sendJson(
  res: ApiRes,
  status: number,
  body: unknown,
  cacheControl = 'public, s-maxage=45, stale-while-revalidate=60',
): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', cacheControl);
  res.end(JSON.stringify(body));
}

/**
 * Solo GET/HEAD: cualquier otro método bypassa el edge cache y quemaría
 * cuota. Responde 405 y devuelve false si hay que cortar.
 */
export function isReadMethodOr405(req: ApiReq, res: ApiRes): boolean {
  const method = (req.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    sendJson(res, 405, { error: 'Metodo no permitido' });
    return false;
  }
  return true;
}

/** Primer valor de un query param que puede llegar como array. */
export function firstQueryParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// ---- Upstream ----------------------------------------------------------------

/** Fetch con timeout y cancelación; lanza en status no-ok. */
export async function fetchJson(
  url: string,
  timeoutMs = 8000,
  extraHeaders: Record<string, string> = {},
  userAgent = 'lafija-api/1.0',
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': userAgent, ...extraHeaders },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
