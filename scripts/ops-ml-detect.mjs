// Nüva One — Equipo ML/Anomalías. Estadístico (z-score), sin entrenamiento, sin dependencias.
// Lee ops_metrics_hourly (alimentada por ops-watch.mjs) vía RPC ops_detect_anomalies,
// registra hallazgos en ops_anomalies (dedupe por fingerprint) y alerta Telegram.
const env = process.env;
const DRY = env.OPS_DRY_RUN === '1';
const SB_URL = (env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';
const TG_TOKEN = env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = env.TELEGRAM_CHAT_ID || '';
const RUN_URL = env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
  ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : '';

if (!SB_URL || !SB_KEY) {
  console.log('::error title=Configuracion incompleta::Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exitCode = 1;
}

const sb = (path, init = {}) => fetch(`${SB_URL}/rest/v1/${path}`, {
  ...init,
  headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal', ...init.headers },
  signal: AbortSignal.timeout(15000),
});

function severityFor(deviations) {
  if (deviations >= 6) return 'critical';
  if (deviations >= 4.5) return 'warning';
  return 'info';
}

async function notify(text) {
  const msg = RUN_URL ? `${text}\n${RUN_URL}` : text;
  if (DRY || !TG_TOKEN || !TG_CHAT) { console.log(`[notify${DRY ? ':dry' : ':sin-telegram'}] ${msg}`); return; }
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text: msg.slice(0, 3500), disable_web_page_preview: true }),
    signal: AbortSignal.timeout(15000),
  });
}

async function main() {
  if (!SB_URL || !SB_KEY) return;

  const r = await sb('rpc/ops_detect_anomalies', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({}) });
  if (r.status !== 200) { console.error('ops_detect_anomalies HTTP', r.status, await r.text()); process.exitCode = 1; return; }
  const anomalies = await r.json();
  console.log(`Detectadas ${anomalies.length} anomalías (>= 3 desviaciones estándar).`);

  for (const a of anomalies) {
    const fingerprint = `anomaly:${a.metric}`;
    const severity = severityFor(a.deviations);
    const summary = `${a.metric}: observado ${Number(a.observed).toFixed(2)} vs esperado ${Number(a.expected).toFixed(2)} (${Number(a.deviations).toFixed(1)} desv. std.)`;
    console.log(`${severity.toUpperCase()} ${summary}`);
    if (DRY) { await notify(`📈 [DRY] ${summary}`); continue; }

    const existing = await sb(`ops_anomalies?fingerprint=eq.${encodeURIComponent(fingerprint)}&status=eq.open&select=id`, { headers: { Prefer: 'return=representation' } });
    const already = existing.status === 200 && (await existing.json()).length > 0;
    if (already) continue; // ya está abierta, evita repetir alerta cada hora

    await sb('ops_anomalies', { method: 'POST', body: JSON.stringify({
      metric: a.metric, observed: a.observed, expected: a.expected, stddev: a.stddev,
      deviations: a.deviations, severity, fingerprint, window_bucket: a.window_bucket }) });
    await notify(`📈 ANOMALÍA (${severity}) · ${summary}`);
  }
}

main().catch((e) => { console.error('ops-ml-detect error:', e); process.exit(1); });
