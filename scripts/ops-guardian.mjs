// Nüva One — Guardián de Seguridad. Determinista, sin LLM: npm audit + gitleaks (paso previo en el workflow)
// escriben hallazgos en ops_findings (dedupe por fingerprint) y alertan Telegram en crítico/alto.
import { readFileSync, existsSync } from 'node:fs';

const env = process.env;
const DRY = env.OPS_DRY_RUN === '1';
const SB_URL = (env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';
const TG_TOKEN = env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = env.TELEGRAM_CHAT_ID || '';
const GITLEAKS_REPORT = env.GITLEAKS_REPORT_PATH || 'gitleaks-report.json';
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

async function notify(text) {
  const msg = RUN_URL ? `${text}\n${RUN_URL}` : text;
  if (DRY || !TG_TOKEN || !TG_CHAT) { console.log(`[notify${DRY ? ':dry' : ':sin-telegram'}] ${msg}`); return; }
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text: msg.slice(0, 3500), disable_web_page_preview: true }),
    signal: AbortSignal.timeout(15000),
  });
}

async function upsertFinding({ source, severity, title, details, fingerprint }) {
  console.log(`${severity.toUpperCase()} [${source}] ${title}`);
  if (DRY) { await notify(`🛡️ [DRY] (${severity}) ${title}`); return; }
  const existing = await sb(`ops_findings?fingerprint=eq.${encodeURIComponent(fingerprint)}&status=eq.open&select=id`, { headers: { Prefer: 'return=representation' } });
  if (existing.status === 200 && (await existing.json()).length > 0) return; // ya abierto, no repite alerta
  await sb('ops_findings', { method: 'POST', body: JSON.stringify({ source, severity, title: title.slice(0, 300), details, fingerprint }) });
  if (severity === 'critical' || severity === 'high') await notify(`🛡️ HALLAZGO (${severity}) · ${title}`);
}

// --- npm audit: solo vulnerabilidades high/critical con arreglo disponible ---
async function checkNpmAudit() {
  let audit;
  try {
    audit = JSON.parse(readFileSync('npm-audit.json', 'utf8'));
  } catch {
    console.log('npm-audit.json no encontrado, se omite este check.');
    return;
  }
  const vulns = Object.values(audit.vulnerabilities || {});
  const bad = vulns.filter((v) => v.severity === 'high' || v.severity === 'critical');
  for (const v of bad) {
    await upsertFinding({
      source: 'npm_audit', severity: v.severity, title: `Dependencia vulnerable: ${v.name} (${v.severity})`,
      details: { via: (v.via || []).map((x) => (typeof x === 'string' ? x : x.title)).slice(0, 5), fixAvailable: !!v.fixAvailable },
      fingerprint: `npm_audit:${v.name}:${v.severity}`,
    });
  }
  if (!bad.length) console.log('npm audit: sin vulnerabilidades high/critical.');
}

// --- gitleaks: cualquier secreto detectado es crítico ---
async function checkGitleaks() {
  if (!existsSync(GITLEAKS_REPORT)) { console.log('Sin reporte de gitleaks (sin hallazgos o paso no ejecutado).'); return; }
  let leaks;
  try { leaks = JSON.parse(readFileSync(GITLEAKS_REPORT, 'utf8')); } catch { leaks = []; }
  for (const l of leaks || []) {
    await upsertFinding({
      source: 'gitleaks', severity: 'critical', title: `Posible secreto expuesto: ${l.RuleID} en ${l.File}`,
      details: { file: l.File, line: l.StartLine, commit: l.Commit }, fingerprint: `gitleaks:${l.File}:${l.RuleID}:${l.StartLine}`,
    });
  }
}

async function main() {
  await checkNpmAudit();
  await checkGitleaks();
}

main().catch((e) => { console.error('ops-guardian error:', e); process.exit(1); });
