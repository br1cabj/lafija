/**
 * Verificador de sincronización con Supabase para LA FIJA.
 *
 * Uso: npm run check:supabase
 *
 * Chequea en cascada:
 *  1. Configuración (.env)
 *  2. Conectividad con el proyecto
 *  3. Esquema (tablas bets / notes)
 *  4. RLS anónima (select sin sesión => 0 filas)
 *  5. Login con usuario de prueba (CHECK_EMAIL / CHECK_PASSWORD en .env)
 *  6. CRUD real con sesión (insert/read/update/delete de filas probe)
 *  7. Reporte: filas por usuario y filas huérfanas (jsonb sin id interno)
 *
 * Exit code 0 = todo OK, 1 = algún chequeo falló.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

const ok = (msg) => console.log(`${GREEN}  ✓${RESET} ${msg}`);
const fail = (msg) => console.log(`${RED}  ✗${RESET} ${msg}`);
const warn = (msg) => console.log(`${YELLOW}  !${RESET} ${msg}`);
const info = (msg) => console.log(`${DIM}  · ${msg}${RESET}`);

const results = [];
const record = (name, passed, detail = '') => {
  results.push({ name, passed });
  if (passed) ok(`${name}${detail ? ` ${DIM}— ${detail}${RESET}` : ''}`);
  else fail(`${name}${detail ? ` ${DIM}— ${detail}${RESET}` : ''}`);
};

// ---- 1. Configuración ------------------------------------------------------

console.log(`\n${BOLD}LA FIJA · Verificación de Supabase${RESET}\n`);

function parseEnv() {
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    const env = {};
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
    return env;
  } catch {
    return null;
  }
}

const env = parseEnv();
const url = env?.VITE_SUPABASE_URL ?? '';
const anonKey = env?.VITE_SUPABASE_ANON_KEY ?? '';
const checkEmail = env?.CHECK_EMAIL ?? '';
const checkPassword = env?.CHECK_PASSWORD ?? '';

let abort = false;

if (!url || !anonKey) {
  fail('1. Configuración — faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env');
  results.push({ name: 'Configuración', passed: false });
  abort = true;
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in|net)/i.test(url)) {
  warn(`1. Configuración — la URL no parece de Supabase: ${url}`);
  results.push({ name: 'Configuración', passed: true });
} else {
  ok(`1. Configuración — proyecto ${url.replace(/^https:\/\//, '').split('.')[0]}`);
  results.push({ name: 'Configuración', passed: true });
}

const supabase = abort ? null : createClient(url, anonKey, { auth: { persistSession: false } });

// ---- 2. Conectividad -------------------------------------------------------

if (supabase) {
  const { error } = await supabase.from('bets').select('id', { count: 'exact', head: true });
  record('2. Conectividad', !error || !/fetch/i.test(error.message ?? ''), error?.message ?? '');
  if (error && /fetch/i.test(error.message ?? '')) abort = true;
}

// ---- 3. Esquema ------------------------------------------------------------

if (supabase && !abort) {
  for (const table of ['bets', 'notes']) {
    const { error } = await supabase.from(table).select('id, user_id, data, updated_at').limit(1);
    const exists = !error || !/relation|does not exist|schema/i.test(error.message ?? '');
    record(`3. Tabla "${table}"`, exists, exists ? '' : error?.message ?? '');
    if (!exists) abort = true;
  }
}

// ---- 4. RLS anónima --------------------------------------------------------

if (supabase && !abort) {
  for (const table of ['bets', 'notes']) {
    const { data, error } = await supabase.from(table).select('id').limit(5);
    const blocked = !error && Array.isArray(data) && data.length === 0;
    record(
      `4. RLS anónima en "${table}"`,
      blocked,
      blocked ? 'sin sesión no se ven filas' : (error?.message ?? `se filtraron ${data?.length} filas SIN sesión`),
    );
  }
}

// ---- 5. Login usuario de prueba -------------------------------------------

let session = null;

if (supabase && !abort) {
  if (checkEmail && checkPassword) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: checkEmail,
      password: checkPassword,
    });
    session = error ? null : (data.session ?? null);
    record('5. Login usuario de prueba', Boolean(session), error ? error.message : checkEmail);
    if (!session) warn('   El CRUD con sesión no se puede probar sin login. Definí CHECK_EMAIL/CHECK_PASSWORD en .env');
  } else {
    warn('5. Login usuario de prueba — omitido (definí CHECK_EMAIL y CHECK_PASSWORD en .env)');
    results.push({ name: 'Login', passed: true, skipped: true });
  }
}

// ---- 6. CRUD probe con sesión ---------------------------------------------

const PROBE_ID = 'sync-check-probe';
const probeBet = {
  id: PROBE_ID,
  title: 'probe',
  sport: 'football',
  league: 'check',
  type: 'single',
  match: { homeTeam: 'a', awayTeam: 'b', status: 'SCHEDULED', startTime: '', league: 'check' },
  stake: 1,
  odds: 2,
  potentialPayout: 2,
  bookmaker: 'probe',
  status: 'PENDING',
  conditions: [],
  createdAt: new Date().toISOString(),
  tags: [],
};

if (supabase && session) {
  const user = session.user;
  const auth = { global: { headers: { Authorization: `Bearer ${session.access_token}` } } };
  const client = createClient(url, anonKey, auth);

  for (const [table, payload] of [
    ['bets', probeBet],
    ['notes', { id: PROBE_ID, title: 'probe', content: 'probe', createdAt: new Date().toISOString(), tags: [] }],
  ]) {
    let tableOk = true;
    let detail = '';

    const upsert = await client
      .from(table)
      .upsert({ id: PROBE_ID, user_id: user.id, data: payload, updated_at: new Date().toISOString() });
    if (upsert.error) { tableOk = false; detail = `upsert: ${upsert.error.message}`; }

    if (tableOk) {
      const read = await client.from(table).select('data, updated_at').eq('id', PROBE_ID).eq('user_id', user.id).single();
      if (read.error) { tableOk = false; detail = `read: ${read.error.message}`; }
      else if (!read.data?.data?.id) { tableOk = false; detail = 'el jsonb no contiene el id interno'; }
    }

    if (tableOk) {
      const del = await client.from(table).delete().eq('id', PROBE_ID).eq('user_id', user.id);
      if (del.error) { tableOk = false; detail = `delete: ${del.error.message}`; }
    }

    record(`6. CRUD en "${table}"`, tableOk, detail);
  }
} else if (supabase && !abort) {
  warn('6. CRUD con sesión — omitido (sin usuario de prueba)');
  results.push({ name: 'CRUD', passed: true, skipped: true });
}

// ---- 7. Reporte de datos ---------------------------------------------------

if (supabase && session) {
  const auth = { global: { headers: { Authorization: `Bearer ${session.access_token}` } } };
  const client = createClient(url, anonKey, auth);

  for (const table of ['bets', 'notes']) {
    const { data, error } = await client.from(table).select('id, user_id, data').limit(1000);
    if (error) { warn(`7. Reporte "${table}" — ${error.message}`); continue; }

    const rows = data ?? [];
    const byUser = new Map();
    let orphans = 0;
    for (const row of rows) {
      byUser.set(row.user_id, (byUser.get(row.user_id) ?? 0) + 1);
      if (!row.data || typeof row.data !== 'object' || row.data.id !== row.id) orphans += 1;
    }

    const summary = [...byUser.entries()]
      .map(([uid, count]) => `${uid.slice(0, 8)}…: ${count}`)
      .join(', ') || 'sin filas';
    info(`7. "${table}" — ${rows.length} filas (${summary})${orphans ? ` · ${RED}${orphans} huérfanas${RESET}` : ''}`);
    if (orphans > 0) results.push({ name: `Datos "${table}"`, passed: false });
  }
}

// ---- Resumen ---------------------------------------------------------------

const failed = results.filter((r) => !r.passed);
const skipped = results.filter((r) => r.skipped).length;
console.log('');
if (failed.length === 0) {
  console.log(`${GREEN}${BOLD}Todo sincronizado correctamente ✓${RESET} (${results.length - skipped} chequeos${skipped ? `, ${skipped} omitidos` : ''})\n`);
} else {
  console.log(`${RED}${BOLD}${failed.length} chequeo(s) fallaron:${RESET}`);
  for (const r of failed) console.log(`${RED}  - ${r.name}${RESET}`);
  console.log('');
  process.exit(1);
}
