/**
 * agency-integrations-check.mjs — Verificación de estado de integraciones de Nüva One.
 *
 * Evalúa, sin modificar producción ni exponer credenciales:
 *  - GitHub CLI (autenticación existente, sin tokens impresos)
 *  - Supabase (disponibilidad de credenciales de entorno; sin introducir service_role_key)
 *  - Vercel (autenticación CLI)
 *  - Toolchain local (git, node, npm, bun, hermes)
 *
 * Toda salida es diagnóstica de solo lectura. No aplica migraciones, no despliega,
 * no modifica RLS ni permisos. Es seguro ejecutarlo en cualquier rama de trabajo.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd());
const SUPABASE_CONFIG = resolve(REPO_ROOT, "supabase", "config.toml");

function run(cmd, args = []) {
  try {
    const out = execFileSync(cmd, args, { encoding: "utf8", timeout: 8000 });
    return { ok: true, output: out.trim(), error: null };
  } catch (err) {
    return { ok: false, output: null, error: err.message };
  }
}

function redacted(value) {
  return value ? `***redactado (${value.length} chars)***` : "no configurado";
}

function checkGitHub() {
  const auth = run("gh", ["auth", "status"]);
  const user = run("gh", ["api", "user", "--jq", ".login"]);
  return {
    name: "GitHub",
    cliAuth: auth.ok ? "autenticado" : `no autenticado: ${auth.error}`,
    activeAccount: user.ok ? user.output : "desconocido",
    note: "Se reusa la autenticación de gh CLI; no se imprime ni expone ningún token.",
  };
}

function checkSupabase() {
  const envUrl = process.env.SUPABASE_URL;
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let configRef = null;
  try {
    if (existsSync(SUPABASE_CONFIG)) {
      const toml = readFileSync(SUPABASE_CONFIG, "utf8");
      const m = toml.match(/project_id\s*=\s*"([^"]+)"/);
      if (m) configRef = m[1];
    }
  } catch {
    // ignorar: solo lectura de referencia
  }
  return {
    name: "Supabase",
    credentialsConfigured: Boolean(envUrl && envKey),
    url: redacted(envUrl),
    serviceRoleKey: redacted(envKey),
    projectRef: configRef || "no leído",
    http403Cause: "MCP sin permisos de lectura (403); credenciales de entorno no configuradas",
    note: "No se introduce service_role_key en nuevas configuraciones ni archivos.",
  };
}

function checkVercel() {
  const whoami = run("vercel", ["whoami"]);
  return {
    name: "Vercel",
    cliAuth: whoami.ok ? whoami.output : `no autenticado: ${whoami.error}`,
    note: "Solo lectura de autenticación CLI; no se despliega ni publica.",
  };
}

function checkToolchain() {
  const tools = ["git", "node", "npm", "bun", "hermes"];
  const results = {};
  for (const t of tools) {
    const r = run(t, ["--version"]);
    results[t] = r.ok ? r.output.split("\n")[0] : `no disponible: ${r.error}`;
  }
  return { name: "Toolchain local", tools: results };
}

function checkHermes() {
  const version = run("hermes", ["--version"]);
  return {
    name: "Hermes",
    version: version.ok ? version.output.split("\n")[0] : `no disponible: ${version.error}`,
  };
}

export async function checkAll() {
  return [
    checkGitHub(),
    checkSupabase(),
    checkVercel(),
    checkToolchain(),
    checkHermes(),
  ];
}

if (process.argv[1] && process.argv[1].endsWith("agency-integrations-check.mjs")) {
  const report = await checkAll();
  console.log(JSON.stringify(report, null, 2));
}
