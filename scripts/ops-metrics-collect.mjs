// Nüva One — recolector mínimo de métricas para el detector de anomalías.
const env = process.env;
const SB_URL = (env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';
const SITE = (env.OPS_SITE_URL || '').replace(/\/$/, '');
if (!SB_URL || !SB_KEY) throw new Error('Faltan credenciales Supabase');
async function record(metric, value) { const r = await fetch(`${SB_URL}/rest/v1/rpc/ops_record_metric`, { method: 'POST', headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_metric: metric, p_value: value }) }); if (!r.ok) throw new Error(`metric ${metric}: HTTP ${r.status}`); }
async function probe(name, url, headers = {}) { const started = Date.now(); try { const r = await fetch(url, { headers, signal: AbortSignal.timeout(15000) }); const ms = Date.now() - started; await record(`latency_${name}`, ms); return r.ok; } catch { await record(`latency_${name}`, 15000); return false; } }
async function main() { const results = []; if (SITE) results.push(await probe('site_home', `${SITE}/`)); results.push(await probe('supabase_auth', `${SB_URL}/auth/v1/health`, { apikey: env.SUPABASE_PUBLISHABLE_KEY || '' })); results.push(await probe('supabase_rest', `${SB_URL}/rest/v1/ops_incidents?select=id&limit=1`, { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` })); await record('error_rate', results.length ? results.filter((ok) => !ok).length / results.length : 0); }
main().catch((e) => { console.error(e); process.exit(1); });
