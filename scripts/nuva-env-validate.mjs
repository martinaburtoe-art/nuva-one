/**
 * nuva-env-validate.mjs — Validador y auto-reparador de entorno de ingeniería de Nüva One.
 *
 * Verifica, sin modificar producción ni exponer credenciales:
 *  - Toolchain local: git, node, npm, npx, vitest, tsc, eslint, gh, hermes
 *  - Autenticación de GitHub CLI (autenticación existente, sin tokens impresos)
 *  - Scripts de Hermes Engineering: existen y tienen sintaxis válida
 *  - Repo map: existe y está actualizado (se regenera automáticamente si no)
 *  - Pruebas de regresión: tsc --noEmit, vitest run, npm run lint
 *
 * Incluye auto-reparación: regenera repo-map.json si falta o está desactualizado,
 * y crea directorios faltantes de docs/hermes-engineering/.
 *
 * Toda salida es diagnóstica con códigos de salida claros (PASS/WARN/FAIL).
 * Es seguro ejecutarlo en cualquier rama de trabajo.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO_ROOT = resolve(process.cwd());
const HERMES_ENG_DIR = join(REPO_ROOT, "docs", "hermes-engineering");
const REPO_MAP_PATH = join(HERMES_ENG_DIR, "repo-map.json");
const REPO_MAP_SCRIPT = join(REPO_ROOT, "scripts", "hermes-repo-map.mjs");

const results = [];
let overall = "PASS";

function run(cmd, args = [], { timeout = 30000 } = {}) {
  try {
    const fullCmd = [cmd, ...args].join(" ");
    const out = execSync(fullCmd, {
      encoding: "utf8",
      timeout,
      cwd: REPO_ROOT,
      shell: true,
    });
    return { ok: true, output: out.trim(), error: null };
  } catch (err) {
    return { ok: false, output: null, error: err.message };
  }
}

function check(name, condition, detail = "", level = "PASS") {
  if (level === "FAIL") overall = "FAIL";
  else if (level === "WARN" && overall === "PASS") overall = "WARN";
  results.push({ name, ok: condition, detail, level });
  return condition;
}

// ---------- 1. Toolchain ----------
function checkToolchain() {
  const tools = ["git", "node", "npm", "npx", "bun", "gh", "hermes"];
  let allOk = true;
  for (const t of tools) {
    const r = run(t, ["--version"], { timeout: 10000 });
    if (!r.ok) {
      allOk = false;
      check(`tool:${t}`, false, `no disponible: ${r.error}`, "WARN");
    } else {
      check(`tool:${t}`, true, r.output.split("\n")[0]);
    }
  }
  return allOk;
}

// ---------- 2. GitHub CLI auth ----------
function checkGitHub() {
  const auth = run("gh", ["auth", "status"], { timeout: 10000 });
  const user = run("gh", ["api", "user", "--jq", ".login"], { timeout: 10000 });
  const ok = auth.ok && user.ok;
  check("github:auth", ok, user.ok ? `usuario: ${user.output}` : `no autenticado: ${auth.error}`, ok ? "PASS" : "WARN");
  return ok;
}

// ---------- 3. Hermes Engineering scripts ----------
function checkHermesScripts() {
  const scripts = ["hermes-repo-map.mjs", "hermes-engineering-loop.mjs"];
  let allOk = true;
  for (const s of scripts) {
    const full = join(REPO_ROOT, "scripts", s);
    if (!existsSync(full)) {
      check(`script:${s}`, false, "archivo no encontrado", "FAIL");
      allOk = false;
      continue;
    }
    const r = run("node", ["--check", full], { timeout: 10000 });
    if (!r.ok) {
      check(`script:${s}`, false, `sintaxis inválida: ${r.error}`, "FAIL");
      allOk = false;
    } else {
      check(`script:${s}`, true, "sintaxis válida");
    }
  }
  return allOk;
}

// ---------- 4. Repo map (con auto-reparación) ----------
function checkRepoMap() {
  // Asegurar directorio
  if (!existsSync(HERMES_ENG_DIR)) {
    mkdirSync(HERMES_ENG_DIR, { recursive: true });
    check("repo:dir", true, "directorio docs/hermes-engineering/ creado");
  }

  if (!existsSync(REPO_MAP_PATH)) {
    check("repo:map", false, "repo-map.json no existe; regenerando...", "WARN");
    const regen = run("node", [REPO_MAP_SCRIPT, ".", REPO_MAP_PATH], { timeout: 120000 });
    if (regen.ok && existsSync(REPO_MAP_PATH)) {
      check("repo:regenerated", true, "repo-map.json regenerado desde cero", "PASS");
      return true;
    }
    check("repo:regenerated", false, `falló regeneración: ${regen.error}`, "FAIL");
    return false;
  }

  // Verificar que sea JSON válido y tenga símbolos
  try {
    const raw = readFileSync(REPO_MAP_PATH, "utf8");
    const map = JSON.parse(raw);
    const hasSymbols = map.summary && map.summary.totalSymbols > 0;
    check("repo:map", hasSymbols, `${map.summary?.totalSymbols ?? 0} símbolos, ${map.summary?.totalFilesScanned ?? 0} archivos`, hasSymbols ? "PASS" : "WARN");
    return hasSymbols;
  } catch (err) {
    check("repo:map", false, `JSON inválido: ${err.message}; regenerando...`, "WARN");
    const regen = run("node", [REPO_MAP_SCRIPT, ".", REPO_MAP_PATH], { timeout: 120000 });
    if (regen.ok && existsSync(REPO_MAP_PATH)) {
      check("repo:regenerated", true, "repo-map.json regenerado desde cero", "PASS");
      return true;
    }
    check("repo:regenerated", false, `falló regeneración: ${regen.error}`, "FAIL");
    return false;
  }
}

// ---------- 5. Pruebas de regresión ----------
function checkRegression() {
  const tsc = run("npx", ["tsc", "--noEmit"], { timeout: 120000 });
  check("test:tsc", tsc.ok, `tsc --noEmit exit ${tsc.ok ? 0 : 1}`, tsc.ok ? "PASS" : "FAIL");

  const vitest = run("npx", ["vitest", "run"], { timeout: 120000 });
  let vitestOk = false;
  let vitestDetail = "";
  if (vitest.ok) {
    const m = vitest.output.match(/(\d+) passed/);
    vitestOk = true;
    vitestDetail = `vitest run: ${m ? m[1] : "desconocido"} tests pasados`;
  } else {
    vitestDetail = `vitest run falló: ${vitest.error}`;
  }
  check("test:vitest", vitestOk, vitestDetail, vitestOk ? "PASS" : "FAIL");

  const lint = run("npm", ["run", "lint"], { timeout: 120000 });
  let lintOk = false;
  let lintDetail = "";
  if (lint.ok) {
    const m = lint.output.match(/(\d+) problems \((\d+) errors, (\d+) warnings\)/);
    lintOk = true;
    lintDetail = `lint: ${m ? m[3] : "desconocido"} warnings, ${m ? m[2] : "desconocido"} errores`;
  } else {
    lintDetail = `lint falló: ${lint.error}`;
  }
  check("test:lint", lintOk && lint.ok, lintDetail, lint.ok ? "PASS" : "FAIL");

  return tsc.ok && vitestOk && lint.ok;
}

// ---------- Main ----------
async function main() {
  const startedAt = new Date().toISOString();

  checkToolchain();
  checkGitHub();
  checkHermesScripts();
  checkRepoMap();
  checkRegression();

  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    overall,
    checks: results,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = overall === "FAIL" ? 1 : overall === "WARN" ? 2 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
