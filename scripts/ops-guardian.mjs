// Nüva One — Guardián de Seguridad. Determinista, sin LLM.
import { readFileSync, existsSync } from 'node:fs';
const env = process.env;
const DRY = env.OPS_DRY_RUN === '1';
const SB_URL = (env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';
const TG_TOKEN = env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = env.TELEGRAM_CHAT_ID || '';
const GITLEAKS_REPORT = env.GITLEAKS_REPORT_PATH || 'gitleaks-report.json';
const RUN_URL = env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : '';
const sb = (path, init = {}) => fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal', ...init.headers }, signal: AbortSignal.timeout(15000) });
async function notify(text) { const msg = RUN_URL ? `${text}\n${RUN_URL}` : text; if (DRY || !TG_TOKEN || !TG_CHAT) { console.log(`[notify] ${msg}`); return; } await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TG_CHAT, text: msg.slice(0, 3500), disable_web_page_preview: true }), signal: AbortSignal.timeout(15000) }); }
async function upsertFinding({ source, severity, title, details, fingerprint }) { if (DRY) { await notify(`🛡️ [DRY] ${severity}: ${title}`); return; } const existing = await sb(`ops_findings?fingerprint=eq.${encodeURIComponent(fingerprint)}&status=eq.open&select=id`, { headers: { Prefer: 'return=representation' } }); if (existing.status === 200 && (await existing.json()).length) return; const r = await sb('ops_findings', { method: 'POST', body: JSON.stringify({ source, severity, title: title.slice(0, 300), details, fingerprint }) }); if (!r.ok) throw new Error(`ops_findings insert HTTP ${r.status}`); if (severity === 'critical' || severity === 'high') await notify(`🛡️ HALLAZGO (${severity}) · ${title}`); }
async function main() {
  if (!SB_URL || !SB_KEY) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  try { const audit = JSON.parse(readFileSync('npm-audit.json', 'utf8')); for (const v of Object.values(audit.vulnerabilities || {}).filter((x) => x.severity === 'high' || x.severity === 'critical')) await upsertFinding({ source: 'npm_audit', severity: v.severity, title: `Dependencia vulnerable: ${v.name} (${v.severity})`, details: { via: (v.via || []).map((x) => typeof x === 'string' ? x : x.title).slice(0, 5), fixAvailable: !!v.fixAvailable }, fingerprint: `npm_audit:${v.name}:${v.severity}` }); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (!existsSync(GITLEAKS_REPORT)) return;
  let leaks = []; try { leaks = JSON.parse(readFileSync(GITLEAKS_REPORT, 'utf8')); } catch { return; }
  for (const l of leaks) await upsertFinding({ source: 'gitleaks', severity: 'critical', title: `Posible secreto expuesto: ${l.RuleID} en ${l.File}`, details: { file: l.File, line: l.StartLine, commit: l.Commit }, fingerprint: `gitleaks:${l.File}:${l.RuleID}:${l.StartLine}` });
}
main().catch((e) => { console.error('ops-guardian error:', e); process.exit(1); });
