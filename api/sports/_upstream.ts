/**
 * Utilidades compartidas por las funciones serverless de /api/sports.
 * La API key vive SOLO del lado del servidor (env var SPORTS_API_KEY
 * en Vercel) y nunca se expone al cliente.
 */

const API_BASE_URL = 'https://v3.football.api-sports.io';

interface CacheEntry {
  ts: number;
  data: unknown;
}

// Caché en memoria por instancia: con varios usuarios mirando el mismo
// partido, se cuenta como 1 request upstream por ventana de TTL.
const cache = new Map<string, CacheEntry>();

export function getApiKey(): string | null {
  const key = process.env.SPORTS_API_KEY;
  return key && key.trim() !== '' ? key.trim() : null;
}

export async function cachedUpstreamFetch(
  path: string,
  ttlMs: number,
): Promise<unknown> {
  const hit = cache.get(path);
  const now = Date.now();
  if (hit && now - hit.ts < ttlMs) {
    return hit.data;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'x-apisports-key': getApiKey() ?? '' },
  });
  if (!res.ok) {
    throw new Error(`API-Sports respondio HTTP ${res.status}`);
  }
  const json = (await res.json()) as unknown;
  cache.set(path, { ts: now, data: json });
  // Evitar crecimiento ilimitado de la cache en instancias longevas
  if (cache.size > 100) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return json;
}

/** Respuesta JSON de error estandarizada. */
export function sendJsonError(
  res: { statusCode: number; setHeader(name: string, value: string): void; end(body: string): void },
  status: number,
  message: string,
): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: message }));
}
