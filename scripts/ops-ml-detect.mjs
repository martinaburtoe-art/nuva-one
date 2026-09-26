// Nüva One — detección estadística de anomalías. Sin LLM ni dependencias.
const env = process.env;
const DRY = env.OPS_DRY_RUN === '1';
const SB_URL = (env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';
const TG_TOKEN = env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = env.TELEGRAM_CHAT_ID || '';
const RUN_URL = env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : '';
const sb = (path, init = {}) => fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal', ...init.headers }, signal: AbortSignal.timeout(15000) });
const severityFor = (d) => d >= 6 ? 'critical' : d >= 4.5 ? 'warning' : 'info';
async function notify(text) { const msg = RUN_URL ? `${text}\n${RUN_URL}` : text; if (DRY || !TG_TOKEN || !TG_CHAT) { console.log(`[notify] ${msg}`); return; } await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TG_CHAT, text: msg.slice(0, 3500), disable_web_page_preview: true }), signal: AbortSignal.timeout(15000) }); }
async function main() {
  if (!SB_URL || !SB_KEY) throw new Error('Faltan credenciales Supabase');
  const r = await sb('rpc/ops_detect_anomalies', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({}) });
  if (!r.ok) throw new Error(`ops_detect_anomalies HTTP ${r.status}: ${await r.text()}`);
  for (const a of await r.json()) {
    const deviations = Number(a.deviations); const severity = severityFor(deviations);
    const summary = `${a.metric}: observado ${Number(a.observed).toFixed(2)} vs esperado ${Number(a.expected).toFixed(2)} (${deviations.toFixed(1)} desv. std.)`;
    if (DRY) { await notify(`📈 [DRY] ${summary}`); continue; }
    const fingerprint = `anomaly:${a.metric}`;
    const existing = await sb(`ops_anomalies?fingerprint=eq.${encodeURIComponent(fingerprint)}&status=eq.open&select=id`, { headers: { Prefer: 'return=representation' } });
    if (existing.status === 200 && (await existing.json()).length) continue;
    const saved = await sb('ops_anomalies', { method: 'POST', body: JSON.stringify({ metric: a.metric, observed: a.observed, expected: a.expected, stddev: a.stddev, deviations, severity, fingerprint, window_bucket: a.window_bucket }) });
    if (!saved.ok) throw new Error(`ops_anomalies HTTP ${saved.status}`);
    await notify(`📈 ANOMALÍA (${severity}) · ${summary}`);
  }
}
main().catch((e) => { console.error('ops-ml-detect error:', e); process.exit(1); });
