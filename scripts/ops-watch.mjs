// Nüva One — Vigía de producción. Sin LLM, sin dependencias (Node >= 18).
// Detecta -> re-verifica -> registra en ops_incidents -> alerta Telegram (dedupe).
const env = process.env;
const DRY = env.OPS_DRY_RUN === '1';
const SITE = (env.OPS_SITE_URL || '').replace(/\/$/, '');
const SB_URL = (env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';
const SB_ANON = env.SUPABASE_PUBLISHABLE_KEY || '';
const GH_REPO = env.GITHUB_REPOSITORY || '';
const GH_TOKEN = env.GITHUB_TOKEN || '';
const TG_TOKEN = env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = env.TELEGRAM_CHAT_ID || '';
const RUN_URL = env.GITHUB_SERVER_URL && GH_REPO && env.GITHUB_RUN_ID
  ? `${env.GITHUB_SERVER_URL}/${GH_REPO}/actions/runs/${env.GITHUB_RUN_ID}` : '';
const SLOW_MS = 6000;
const REMIND_MS = 6 * 3600 * 1000;
const RETRY_MS = Number(env.OPS_RETRY_MS ?? 10000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (name, summary = 'ok', details = {}) => ({ name, ok: true, severity: 'info', summary, details });
const bad = (name, severity, summary, details = {}) => ({ name, ok: false, severity, summary, details });

async function http(url, init = {}) {
  const t = Date.now();
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
    return { status: r.status, ms: Date.now() - t, res: r };
  } catch (e) {
    return { status: 0, ms: Date.now() - t, error: e?.name || 'error' };
  }
}

const gh = (path) => http(`https://api.github.com/repos/${GH_REPO}/${path}`, {
  headers: {
    Authorization: `Bearer ${GH_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'nuva-ops-watch',
  },
});

const checks = [];

if (SITE) {
  for (const path of ['/', '/demo', '/auth']) {
    checks.push(async () => {
      const name = `site:${path}`;
      const r = await http(SITE + path, { redirect: 'follow' });
      const sev = path === '/' ? 'critical' : 'warning';
      if (r.status !== 200) return bad(name, sev, `HTTP ${r.status || 'sin respuesta'} en ${path}`, { status: r.status, ms: r.ms, error: r.error });
      if (r.ms > SLOW_MS) return bad(name, 'warning', `Lento: ${r.ms} ms en ${path}`, { ms: r.ms });
      return ok(name, `${r.ms} ms`, { ms: r.ms });
    });
  }
}

if (SB_URL && SB_ANON) {
  checks.push(async () => {
    const r = await http(`${SB_URL}/auth/v1/health`, { headers: { apikey: SB_ANON } });
    return r.status === 200 ? ok('supabase:auth', `${r.ms} ms`) : bad('supabase:auth', 'critical', `Auth health HTTP ${r.status || 'sin respuesta'}`, { status: r.status, ms: r.ms });
  });
}

if (SB_URL && SB_KEY) {
  checks.push(async () => {
    const r = await http(`${SB_URL}/rest/v1/ops_incidents?select=id&limit=1`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
    return r.status === 200 ? ok('supabase:rest', `${r.ms} ms`) : bad('supabase:rest', 'critical', `PostgREST HTTP ${r.status || 'sin respuesta'}`, { status: r.status, ms: r.ms });
  });
}

if (GH_REPO && GH_TOKEN) {
  checks.push(async () => {
    const r = await gh('actions/workflows/ci.yml/runs?branch=main&status=completed&per_page=1');
    if (r.status !== 200) return ok('github:ci-main', 'sin datos (omitido)');
    const run = (await r.res.json()).workflow_runs?.[0];
    if (run?.conclusion === 'failure') return bad('github:ci-main', 'warning', 'CI de main en rojo', { run: run.html_url });
    return ok('github:ci-main', run?.conclusion || 'sin runs');
  });
  checks.push(async () => {
    const r = await gh('deployments?environment=Production&per_page=1');
    if (r.status !== 200) return ok('vercel:deploy', 'sin datos (omitido)');
    const dep = (await r.res.json())?.[0];
    if (!dep) return ok('vercel:deploy', 'sin deployments');
    const s = await gh(`deployments/${dep.id}/statuses?per_page=1`);
    if (s.status !== 200) return ok('vercel:deploy', 'sin datos (omitido)');
    const state = (await s.res.json())?.[0]?.state;
    if (state === 'failure' || state === 'error') return bad('vercel:deploy', 'critical', `Último deploy a producción: ${state}`, { deployment: dep.id });
    return ok('vercel:deploy', state || 'sin estado');
  });
}

async function runCheck(fn) {
  let r = await fn();
  if (!r.ok && RETRY_MS > 0) { await sleep(RETRY_MS); r = await fn(); }
  return r;
}

const sb = (path, init = {}) => fetch(`${SB_URL}/rest/v1/${path}`, {
  ...init,
  headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal', ...init.headers },
  signal: AbortSignal.timeout(15000),
});

async function notify(text) {
  const msg = RUN_URL ? `${text}\n${RUN_URL}` : text;
  if (DRY || !TG_TOKEN || !TG_CHAT) { console.log(`[notify${DRY ? ':dry' : ':sin-telegram'}] ${msg}`); return false; }
  const r = await http(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text: msg.slice(0, 3500), disable_web_page_preview: true }),
  });
  return r.status === 200;
}

const icon = { critical: '🔴', warning: '🟠', info: 'ℹ️' };

async function main() {
  const results = [];
  for (const c of checks) results.push(await runCheck(c));
  for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.name} — ${r.summary}`);
  if (DRY) { for (const r of results.filter((x) => !x.ok)) await notify(`${icon[r.severity]} [DRY] ${r.name}: ${r.summary}`); return; }

  let open = null;
  if (SB_URL && SB_KEY) {
    const r = await sb('ops_incidents?status=eq.open&select=id,fingerprint,notified_at,consecutive_failures', { headers: { Prefer: 'return=representation' } });
    if (r.status === 200) open = new Map((await r.json()).map((i) => [i.fingerprint, i]));
  }

  const failed = results.filter((r) => !r.ok);
  if (!open) {
    if (failed.length && new Date().getUTCMinutes() < 10)
      await notify(`⚠️ Sin registro de incidentes (Supabase no disponible)\n${failed.map((f) => `${icon[f.severity]} ${f.name}: ${f.summary}`).join('\n')}`);
    return;
  }

  const now = new Date().toISOString();
  for (const r of results) {
    const cur = open.get(r.name);
    if (!r.ok && !cur) {
      const sent = await notify(`${icon[r.severity]} ${r.severity.toUpperCase()} · ${r.name}\n${r.summary}`);
      await sb('ops_incidents', { method: 'POST', body: JSON.stringify({ fingerprint: r.name, check_name: r.name, severity: r.severity, summary: r.summary.slice(0, 500), details: r.details, notified_at: sent ? now : null }) });
    } else if (!r.ok && cur) {
      const patch = { last_seen_at: now, consecutive_failures: cur.consecutive_failures + 1, summary: r.summary.slice(0, 500), details: r.details };
      const stale = !cur.notified_at || Date.now() - new Date(cur.notified_at).getTime() > REMIND_MS;
      if (stale && (await notify(`${icon[r.severity]} SIGUE ABIERTO · ${r.name}\n${r.summary}`))) patch.notified_at = now;
      await sb(`ops_incidents?id=eq.${cur.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    } else if (r.ok && cur) {
      await sb(`ops_incidents?id=eq.${cur.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'resolved', resolved_at: now, last_seen_at: now }) });
      await notify(`✅ Recuperado · ${r.name}`);
    }
  }
}

main().catch((e) => { console.error('ops-watch error:', e); process.exit(1); });
