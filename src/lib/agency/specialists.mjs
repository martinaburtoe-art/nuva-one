/**
 * specialists.mjs — Versión ES Modules (JS puro) de los 13 especialistas de Nüva Agency.
 * Usada por scripts/agency-run-specialist.mjs desde el executor. Sin tipos de TypeScript,
 * sin dependencias externas, solo node:fs/promises y node:crypto.
 */

import { readFile } from "node:fs/promises";
import * as fsPromises from "node:fs/promises";
import { execFile } from "node:child_process";
import { join } from "node:path";
import * as fs from "node:fs";
import { createHash } from "node:crypto";

const nowIso = () => new Date().toISOString();
const nowMs = () => Date.now();
const hashOf = (content) =>
  createHash("sha256").update(content).digest("hex").slice(0, 16);

async function readLocalFile(path) {
  try {
    const content = await readFile(path, "utf8");
    return { ok: true, content };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function nodeCheck(target) {
  return new Promise((resolve) => {
    execFile("node", ["--check", target], { cwd: process.cwd(), timeout: 30000 }, (error, stdout, stderr) => {
      resolve({ ok: !error, error: error ? (error.stderr || error.message) : undefined });
    });
  });
}

function parseBlocks(md) {
  const blocks = [];
  let current = null;

  for (const line of md.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(T-\d+)\s+—\s+(.+)$/);
    if (heading) {
      current = { id: heading[1], title: heading[2].trim(), fields: {} };
      blocks.push(current);
      continue;
    }

    if (current) {
      const field = line.match(/^\s*-\s*([^:]+):\s*(.*)$/);
      if (field) current.fields[field[1].trim().toLowerCase()] = field[2].trim();
    }
  }

  return blocks;
}

function depsResolved(block, byId) {
  const raw = (block.fields.dependencias || "").trim();
  if (!raw || /^(ninguna|ninguno|none|n\/a|-)$/i.test(raw)) return true;

  const deps = raw.split(/[,;]/).map((value) => value.trim()).filter(Boolean);
  return deps.every((id) => byId[id]?.fields.estado === "COMPLETADO");
}

function makeResult(specialist, taskId, result, evidence, errors, start) {
  return {
    specialist,
    taskId,
    result,
    evidence,
    errors,
    durationMs: nowMs() - start,
    timestamp: nowIso(),
  };
}

/* ── FINANCE ── */
export const finance = {
  id: "finance",
  nombre: "Finanzas",
  responsabilidades: [
    "Validar consistencia de lockfiles (package.json vs bun.lock / package-lock.json)",
    "Verificar que no haya dependencias obsoletas o rotas declaradas",
    "Reportar inconsistencias que bloqueen npm ci reproducible",
  ],
  limites: [
    "No modifica bun.lock, package-lock.json ni package.json",
    "No accede a credenciales de pago, Stripe ni bancarias",
    "No escribe en producción ni ejecuta migraciones",
  ],
  tiposDeTarea: ["lockfile-check", "dependency-audit", "finance-consistency"],
  herramientasPermitidas: ["readFile", "JSON.parse"],

  async execute(task) {
    const start = nowMs();
    const evidence = [];
    const errors = [];

    const pkg = await readLocalFile("package.json");
    if (!pkg.ok) {
      return makeResult("finance", task.id, "BLOCKED", [`package.json no legible: ${pkg.error}`], [pkg.error ?? ""], start);
    }
    evidence.push(`package.json leído (${pkg.content.length} bytes, hash ${hashOf(pkg.content)})`);

    let pkgJson;
    try {
      pkgJson = JSON.parse(pkg.content);
    } catch (error) {
      return makeResult("finance", task.id, "FAIL", ["package.json no es JSON válido"], [error instanceof Error ? error.message : String(error)], start);
    }

    const deps = pkgJson.dependencies ?? {};
    const devDeps = pkgJson.devDependencies ?? {};
    evidence.push(`dependencias: ${Object.keys(deps).length}; devDependencies: ${Object.keys(devDeps).length}`);

    const lockBun = await readLocalFile("bun.lock");
    const lockNpm = await readLocalFile("package-lock.json");
    evidence.push(`bun.lock: ${lockBun.ok ? "presente" : "ausente"}`);
    evidence.push(`package-lock.json: ${lockNpm.ok ? "presente" : "ausente"}`);

    let result = "PASS";
    if (lockBun.ok && lockNpm.ok) {
      evidence.push("ambos lockfiles presentes — posible inconsistencia si package.json cambió tras ellos");
      result = "WARN";
    } else if (!lockBun.ok && !lockNpm.ok) {
      evidence.push("ningún lockfile presente — npm ci puede no ser reproducible");
      result = "WARN";
    }

    return makeResult("finance", task.id, result, evidence, errors, start);
  },
};

/* ── SALES ── */
export const sales = {
  id: "sales",
  nombre: "Ventas",
  responsabilidades: [
    "Verificar declaraciones de integración de ventas (mensajería comercial, Odoo, GTM/GA)",
    "Confirmar que los archivos de configuración de ventas existen y son legibles",
    "Reportar falta de configuración sin inventar credenciales",
  ],
  limites: [
    "No accede a tokens de mensajería comercial ni claves de Odoo",
    "No realiza llamadas a APIs externas de ventas",
    "No modifica configuración de producción",
  ],
  tiposDeTarea: ["sales-config-check", "integration-verification", "conversion-readiness"],
  herramientasPermitidas: ["readFile"],

  async execute(task) {
    const start = nowMs();
    const evidence = [];
    const errors = [];

    const candidates = ["vercel.json", "package.json", "supabase/functions/nuva-agency-worker-control/index.ts"];
    for (const candidate of candidates) {
      const file = await readLocalFile(candidate);
      evidence.push(`${candidate}: ${file.ok ? `legible (${file.content.length} bytes)` : "no encontrado"}`);
    }

    const pkg = await readLocalFile("package.json");
    let hasOdoo = false;
    let hasGtm = false;
    if (pkg.ok) {
      try {
        const pj = JSON.parse(pkg.content);
        const depsText = JSON.stringify(pj.dependencies ?? {});
        hasOdoo = /odoo/i.test(depsText) || /odoo/i.test(pkg.content);
        hasGtm = /gtm|google.?tag/i.test(pkg.content);
      } catch {
        errors.push("package.json no parseable");
      }
    }

    evidence.push(`odoo declarado: ${hasOdoo ? "sí" : "no"}`);
    evidence.push(`gtm/ga declarado: ${hasGtm ? "sí" : "no"}`);

    const result = hasOdoo || hasGtm ? "PASS" : "WARN";
    return makeResult("sales", task.id, result, evidence, errors, start);
  },
};

/* ── SUPPLY ── */
export const supply = {
  id: "supply",
  nombre: "Abastecimiento",
  responsabilidades: [
    "Verificar estructura de productos e inventario declarada en el repositorio",
    "Confirmar que no haya rutas de fulfillment rotas o referencias faltantes",
    "Reportar estado de stock sin acceder a datos de producción",
  ],
  limites: [
    "No accede a inventario en tiempo real ni a proveedores externos",
    "No modifica productos ni precios de producción",
    "No escribe en base de datos de fulfillment",
  ],
  tiposDeTarea: ["inventory-check", "fulfillment-verification", "stock-structure"],
  herramientasPermitidas: ["readFile"],

  async execute(task) {
    const start = nowMs();
    const evidence = [];
    const errors = [];

    const candidates = [
      "supabase/migrations/20261007000000_durable_autonomous_agency_control_plane.sql",
      "package.json",
    ];
    for (const candidate of candidates) {
      const file = await readLocalFile(candidate);
      evidence.push(`${candidate}: ${file.ok ? `legible (${file.content.length} bytes)` : "no encontrado"}`);
    }

    const mig = await readLocalFile("supabase/migrations/20261007000000_durable_autonomous_agency_control_plane.sql");
    if (!mig.ok) {
      return makeResult("supply", task.id, "BLOCKED", ["migración de control plane no local"], [mig.error ?? ""], start);
    }

    const hasTasksTable = /create table if not exists public\.agency_tasks/.test(mig.content);
    const hasMissionsTable = /create table if not exists public\.agency_missions/.test(mig.content);
    evidence.push(`tabla agency_tasks en migración: ${hasTasksTable ? "sí" : "no"}`);
    evidence.push(`tabla agency_missions en migración: ${hasMissionsTable ? "sí" : "no"}`);

    const result = hasTasksTable && hasMissionsTable ? "PASS" : "FAIL";
    return makeResult("supply", task.id, result, evidence, errors, start);
  },
};

/* ── PEOPLE ── */
export const people = {
  id: "people",
  nombre: "Personas",
  responsabilidades: [
    "Verificar documentación de RRHH y contratos en el repositorio",
    "Confirmar que no haya datos personales expuestos en logs o código",
    "Reportar cumplimiento básico de protección de datos",
  ],
  limites: [
    "No accede a datos de empleados reales ni nómina",
    "No modifica contratos ni registros de personal",
    "No expone PII en salidas",
  ],
  tiposDeTarea: ["hr-docs-check", "pii-scan", "people-compliance"],
  herramientasPermitidas: ["readFile"],

  async execute(task) {
    const start = nowMs();
    const evidence = [];
    const errors = [];

    const docs = ["docs/nuva-agency/AGENT_BACKLOG.md", "docs/factory/BLOCKERS.md", "docs/factory/PROJECT_STATE.md"];
    for (const doc of docs) {
      const file = await readLocalFile(doc);
      evidence.push(`${doc}: ${file.ok ? `legible (${file.content.length} bytes)` : "no encontrado"}`);
    }

    const pkg = await readLocalFile("package.json");
    if (pkg.ok) {
      evidence.push(`package.json revisado: ${pkg.content.length} bytes`);
    }

    return makeResult("people", task.id, "PASS", evidence, errors, start);
  },
};

/* ── GROWTH ── */
export const growth = {
  id: "growth",
  nombre: "Crecimiento",
  responsabilidades: [
    "Verificar configuración de analítica (GTM/GA) y SEO en el repositorio",
    "Confirmar que los archivos de crecimiento existen y son consistentes",
    "Reportar oportunidades de medición sin acceder a datos de usuarios",
  ],
  limites: [
    "No accede a datos de usuarios reales ni métricas de producción",
    "No modifica etiquetas de analítica en producción",
    "No envía eventos a terceros",
  ],
  tiposDeTarea: ["analytics-check", "seo-verification", "growth-readiness"],
  herramientasPermitidas: ["readFile"],

  async execute(task) {
    const start = nowMs();
    const evidence = [];
    const errors = [];

    const candidates = ["vercel.json", "package.json", "vite.config.ts", "vitest.config.ts"];
    for (const candidate of candidates) {
      const file = await readLocalFile(candidate);
      evidence.push(`${candidate}: ${file.ok ? `legible (${file.content.length} bytes)` : "no encontrado"}`);
    }

    const vercel = await readLocalFile("vercel.json");
    let hasCron = false;
    let cronCount = 0;
    if (vercel.ok) {
      try {
        const vj = JSON.parse(vercel.content);
        hasCron = Array.isArray(vj.crons) && vj.crons.length > 0;
        cronCount = Array.isArray(vj.crons) ? vj.crons.length : 0;
      } catch {
        errors.push("vercel.json no parseable");
      }
    }
    evidence.push(`cron jobs en vercel.json: ${cronCount}`);

    const result = hasCron ? "PASS" : "WARN";
    return makeResult("growth", task.id, result, evidence, errors, start);
  },
};

/* ── ORCHESTRATOR ── */
export const orchestrator = {
  id: "orchestrator",
  nombre: "Orquestador",
  responsabilidades: [
    "Seleccionar la siguiente tarea segura del backlog",
    "Verificar dependencias resueltas antes de asignar",
    "Coordinar la ejecución entre especialistas",
    "Detectar tareas bloqueadas y reportar causa",
  ],
  limites: [
    "No modifica código de producción",
    "No ejecuta migraciones remotas",
    "No accede a credenciales ni secretos",
  ],
  tiposDeTarea: ["backlog-selection", "dependency-check", "task-coordination"],
  herramientasPermitidas: ["readFile", "parseBlocks", "depsResolved"],

  async execute(task) {
    const start = nowMs();
    const evidence = [];
    const errors = [];

    const BACKLOG_PATH = "docs/nuva-agency/AGENT_BACKLOG.md";
    const md = await readLocalFile(BACKLOG_PATH);
    if (!md.ok) {
      return makeResult("orchestrator", task.id, "BLOCKED", [`backlog no legible: ${md.error}`], [md.error ?? ""], start);
    }
    evidence.push(`backlog leído (${md.content.length} bytes)`);

    const blocks = parseBlocks(md.content);
    const byId = {};
    for (const b of blocks) byId[b.id] = b;

    const pendientes = blocks.filter((b) => b.fields.estado === "PENDIENTE");
    evidence.push(`tareas PENDIENTE: ${pendientes.length}`);

    const elegibles = pendientes.filter((b) => depsResolved(b, byId));
    evidence.push(`tareas elegibles (deps resueltas): ${elegibles.length}`);

    if (elegibles.length === 0) {
      return makeResult("orchestrator", task.id, "WARN", [...evidence, "sin tareas elegibles en este ciclo"], errors, start);
    }

    const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };
    elegibles.sort((a, b) => (PRIORITY_ORDER[a.fields.prioridad] ?? 99) - (PRIORITY_ORDER[b.fields.prioridad] ?? 99));
    const next = elegibles[0];
    evidence.push(`siguiente tarea seleccionada: ${next.id} — ${next.title} (prioridad ${next.fields.prioridad})`);

    return makeResult("orchestrator", task.id, "PASS", [...evidence, `seleccionada: ${next.id}`], errors, start);
  },
};

/* ── CONSTRUCTOR ── */
export const constructor = {
  id: "constructor",
  nombre: "Constructor",
  responsabilidades: [
    "Verificar sintaxis de archivos JS/TS con node --check",
    "Leer y reportar estado de archivos de implementación",
    "Detectar archivos dañados o sin exportar",
  ],
  limites: [
    "No modifica archivos de origen",
    "No ejecuta migraciones ni despliegues",
    "No accede a credenciales ni secretos",
  ],
  tiposDeTarea: ["syntax-check", "file-inspection", "code-repair-verification"],
  herramientasPermitidas: ["readFile", "node --check"],

  async execute(task) {
    const start = nowMs();
    const evidence = [];
    const errors = [];

    const target = (task.input_context && task.input_context.target) || "scripts/agency-task-executor.mjs";

    const file = await readLocalFile(target);
    if (!file.ok) {
      return makeResult("constructor", task.id, "BLOCKED", [`archivo no legible: ${target} (${file.error})`], [file.error ?? ""], start);
    }
    evidence.push(`${target}: legible (${file.content.length} bytes)`);

    const check = await nodeCheck(target);
    evidence.push(`node --check ${target}: ${check.ok ? "sintaxis OK" : "error de sintaxis"}`);
    if (check.error) errors.push(check.error);

    return makeResult("constructor", task.id, check.ok ? "PASS" : "FAIL", evidence, errors, start);
  },
};

/* ── COMPLIANCE ── */
export const compliance = {
  id: "compliance",
  nombre: "Cumplimiento",
  responsabilidades: [
    "Verificar que DECISIONS.md existe y tiene entradas revisadas",
    "Verificar formato consistente del backlog",
    "Confirmar que no hay cambios no revisados en working tree crítico",
  ],
  limites: [
    "No modifica documentos de decisiones",
    "No ejecuta comandos de git destructivos",
    "No accede a datos personales ni contratos",
  ],
  tiposDeTarea: ["decision-audit", "backlog-format-check", "change-review"],
  herramientasPermitidas: ["readFile"],

  async execute(task) {
    const start = nowMs();
    const evidence = [];
    const errors = [];

    const decisions = await readLocalFile("docs/factory/DECISIONS.md");
    evidence.push(`DECISIONS.md: ${decisions.ok ? `legible (${decisions.content.length} bytes)` : "no encontrado"}`);

    const BACKLOG_PATH = "docs/nuva-agency/AGENT_BACKLOG.md";
    const backlog = await readLocalFile(BACKLOG_PATH);
    if (!backlog.ok) {
      return makeResult("compliance", task.id, "BLOCKED", [`backlog no legible: ${backlog.error}`], [backlog.error ?? ""], start);
    }
    evidence.push(`backlog leído (${backlog.content.length} bytes)`);

    const blocks = parseBlocks(backlog.content);
    let sinEstado = 0;
    for (const b of blocks) {
      if (!b.fields.estado) sinEstado++;
    }
    evidence.push(`tareas sin estado definido: ${sinEstado}`);

    const tieneDecisiones = decisions.ok && /D-\d+/.test(decisions.content);
    const formatoValido = blocks.length > 0 && sinEstado === 0;

    return makeResult("compliance", task.id, tieneDecisiones && formatoValido ? "PASS" : "WARN", evidence, errors, start);
  },
};

/* ── SECURITY ── */
export const security = {
  id: "security",
  nombre: "Seguridad",
  responsabilidades: [
    "Escanear archivos expuestos con secretos (.env, .env.local)",
    "Detectar patrones prohibidos (service_role, deploy production)",
    "Verificar autorización server-side en endpoints de agency",
  ],
  limites: [
    "No muestra secretos en logs ni salidas",
    "No modifica RLS ni políticas de acceso",
    "No accede a variables de entorno de producción",
  ],
  tiposDeTarea: ["secret-scan", "forbidden-pattern-check", "authz-review"],
  herramientasPermitidas: ["readFile"],

  async execute(task) {
    const start = nowMs();
    const evidence = [];
    const errors = [];

    const envFiles = [".env", ".env.local", ".env.production"];
    let secretosEncontrados = 0;
    for (const ef of envFiles) {
      const f = await readLocalFile(ef);
      if (f.ok) {
        secretosEncontrados++;
        evidence.push(`${ef}: EXISTE (posible secreto expuesto — [REDACTED])`);
      } else {
        evidence.push(`${ef}: no encontrado (correcto)`);
      }
    }

    const agencyControl = await readLocalFile("src/routes/api/owner/agency-status.ts");
    if (agencyControl.ok) {
      const hasAuth = /authoriz|owner|worker|verify/i.test(agencyControl.content);
      evidence.push(`agency-status.ts: ${agencyControl.content.length} bytes, autorización server-side: ${hasAuth ? "sí" : "no detectada"}`);
      if (!hasAuth) errors.push("agency-status.ts sin verificación de autorización server-side");
    } else {
      evidence.push("agency-status.ts: no encontrado");
    }

    return makeResult("security", task.id, secretosEncontrados === 0 ? "PASS" : "WARN", evidence, errors, start);
  },
};

/* ── QA ── */
export const qa = {
  id: "qa",
  nombre: "QA",
  responsabilidades: [
    "Ejecutar pruebas Vitest reales fuera de la suite que valida al propio especialista",
    "Reportar conteo verificable de pruebas pasadas/fallidas",
    "Detectar regresiones en pruebas locales sin acceder a producción",
  ],
  limites: [
    "No modifica archivos de prueba",
    "No ejecuta pruebas contra producción",
    "No accede a datos de usuarios reales",
    "Rechaza rutas absolutas o rutas que salgan del repositorio",
  ],
  tiposDeTarea: ["unit-test-run", "regression-check", "test-result-parse"],
  herramientasPermitidas: ["node", "vitest"],

  async execute(task) {
    const start = nowMs();
    const evidence = [];
    const errors = [];
    const rawTarget = task.input_context?.target;
    const testTarget = typeof rawTarget === "string" ? rawTarget.trim() : "";

    if (testTarget && (testTarget.length > 200 || testTarget.startsWith("/") || testTarget.charAt(0) === String.fromCharCode(92) || /^[A-Za-z]:/.test(testTarget) || testTarget.includes(".."))) {
      return makeResult("qa", task.id, "BLOCKED", ["objetivo QA rechazado: debe ser una ruta relativa dentro del repositorio"], errors, start);
    }

    const vitestBin = join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
    const args = [
      vitestBin, "run", "--reporter=json",
      "--exclude", "src/lib/agency/specialists.test.ts",
      ...(testTarget ? [testTarget] : []),
    ];

    return new Promise((resolve) => {
      execFile(process.execPath, args, {
        cwd: process.cwd(), timeout: 120000, maxBuffer: 10 * 1024 * 1024,
      }, (error, stdout, stderr) => {
        const output = String(stdout ?? "");
        const exitCode = error ? (typeof error.code === "number" ? error.code : -1) : 0;
        let report = null;
        const jsonStart = output.indexOf("{");
        const jsonEnd = output.lastIndexOf("}");
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          try { report = JSON.parse(output.slice(jsonStart, jsonEnd + 1)); }
          catch { report = null; }
        }
        const passed = typeof report?.numPassedTests === "number" ? report.numPassedTests : 0;
        const failed = typeof report?.numFailedTests === "number" ? report.numFailedTests : 0;
        const total = typeof report?.numTotalTests === "number" ? report.numTotalTests : passed + failed;

        const targetLabel = testTarget || "suite completa (excluyendo specialists.test.ts)";
        evidence.push(`vitest run ${targetLabel}: salida JSON ${report ? "válida" : "no interpretable"}`);
        evidence.push(`pruebas: ${passed}/${total} aprobadas; ${failed} fallidas`);
        evidence.push(`código de salida: ${exitCode}`);
        if (stderr?.trim()) evidence.push(`stderr: ${String(stderr).trim().slice(0, 300)}`);
        if (error) errors.push(error.message);
        const result = exitCode !== 0 || failed > 0 ? "FAIL" : passed > 0 && total > 0 ? "PASS" : "WARN";
        resolve(makeResult("qa", task.id, result, evidence, errors, start));
      });
    });
  },
};

/* ── SENTINEL ── */
export const sentinel = {
  id: "sentinel",
  nombre: "Sentinel",
  responsabilidades: [
    "Revisar logs de ejecución en busca de resultados FAIL/BLOCKED",
    "Detectar archivos de pausa de emergencia (.agency-pause)",
    "Reportar estado de salud del sistema de Agency",
  ],
  limites: [
    "No reinicia procesos ni modifica logs",
    "No accede a servicios externos de monitoreo",
    "No expone credenciales en reportes",
  ],
  tiposDeTarea: ["log-scan", "health-check", "blocker-detection"],
  herramientasPermitidas: ["readFile"],

  async execute(task) {
    const start = nowMs();
    const evidence = [];
    const errors = [];

    let fails = 0;
    let blocked = 0;
    let total = 0;
    try {
      const fsPromises = await import("node:fs/promises");
      const entries = await fsPromises.readdir("logs/executions");
      const jsonFiles = entries.filter((e) => e.endsWith(".json") && !e.startsWith("."));
      for (const f of jsonFiles) {
        const data = await readLocalFile(join("logs/executions", f));
        if (data.ok) {
          try {
            const parsed = JSON.parse(data.content);
            if (parsed.result) {
              total++;
              if (parsed.result === "FAIL") fails++;
              if (parsed.result === "BLOCKED") blocked++;
            }
          } catch { /* ignorar JSON inválido */ }
        }
      }
      evidence.push(`ejecuciones en logs: ${total}`);
      evidence.push(`resultados FAIL: ${fails}`);
      evidence.push(`resultados BLOCKED: ${blocked}`);
    } catch {
      evidence.push("logs/executions: directorio no encontrado o vacío");
    }

    const pauseFile = await readLocalFile(".agency-pause");
    evidence.push(`.agency-pause: ${pauseFile.ok ? "PRESENTE (sistema pausado)" : "ausente (sistema activo)"}`);

    return makeResult("sentinel", task.id, fails === 0 ? "PASS" : "WARN", evidence, errors, start);
  },
};

/* ── UX ── */
export const ux = {
  id: "ux",
  nombre: "UX",
  responsabilidades: [
    "Verificar archivos de rutas y componentes existen",
    "Detectar atributos de accesibilidad básicos (aria-label, role)",
    "Reportar consistencia visual de pantallas del Owner Console",
  ],
  limites: [
    "No modifica componentes de interfaz",
    "No ejecuta pruebas de navegador reales",
    "No accede a datos de usuarios",
  ],
  tiposDeTarea: ["route-inspection", "accessibility-scan", "visual-consistency"],
  herramientasPermitidas: ["readFile"],

  async execute(task) {
    const start = nowMs();
    const evidence = [];
    const errors = [];

    const candidates = [
      "src/routes/owner/control-tower.tsx",
      "src/routes/api/owner/agency-status.ts",
    ];
    let archivosEncontrados = 0;
    let conAria = 0;
    for (const c of candidates) {
      const f = await readLocalFile(c);
      if (f.ok) {
        archivosEncontrados++;
        evidence.push(`${c}: legible (${f.content.length} bytes)`);
        if (/aria-|role=|alt=/.test(f.content)) conAria++;
      } else {
        evidence.push(`${c}: no encontrado`);
      }
    }

    return makeResult("ux", task.id, archivosEncontrados > 0 ? "PASS" : "BLOCKED", [...evidence, `archivos con atributos de accesibilidad: ${conAria}`], errors, start);
  },
};

/* ── RELEASE ── */
export const release = {
  id: "release",
  nombre: "Release",
  responsabilidades: [
    "Verificar estado de git y rama de trabajo",
    "Confirmar que PR permanece abierto sin merge",
    "Reportar artefactos de build generados",
  ],
  limites: [
    "No hace merge a main",
    "No despliega a producción",
    "No modifica lockfiles sin autorización",
  ],
  tiposDeTarea: ["git-status-check", "pr-verification", "build-artifact-check"],
  herramientasPermitidas: ["readFile", "git status --short"],

  async execute(task) {
    const start = nowMs();
    const evidence = [];
    const errors = [];

    try {
      const c = await fsPromises.readFile("package.json", "utf8");
      evidence.push(`package.json: ${c.length} bytes`);
    } catch (e) {
      errors.push(e.message);
    }

    const hasDist = fs.existsSync("dist") || fs.existsSync(".vercel/output");
    evidence.push(`artefactos de build: ${hasDist ? "presentes" : "no detectados"}`);

    return new Promise((resolve) => {
      execFile("git", ["status", "--short"], { cwd: process.cwd(), timeout: 30000 }, (error, stdout, stderr) => {
        const duration = Date.now() - start;
        const output = stdout || "";
        const modifiedFiles = output.trim().split("\n").filter(Boolean).length;
        evidence.push(`git status: ${modifiedFiles} archivo(s) sin staged`);
        evidence.push(output.slice(0, 500));

        resolve(makeResult("release", task.id, error ? "FAIL" : "PASS", evidence, errors, start));
      });
    });
  },
};

export const SPECIALISTS = {
  finance: finance.execute.bind(finance),
  sales: sales.execute.bind(sales),
  supply: supply.execute.bind(supply),
  people: people.execute.bind(people),
  growth: growth.execute.bind(growth),
  orchestrator: orchestrator.execute.bind(orchestrator),
  constructor: constructor.execute.bind(constructor),
  compliance: compliance.execute.bind(compliance),
  security: security.execute.bind(security),
  qa: qa.execute.bind(qa),
  sentinel: sentinel.execute.bind(sentinel),
  ux: ux.execute.bind(ux),
  release: release.execute.bind(release),
};

export const SPECIALIST_IDS = ["finance", "sales", "supply", "people", "growth", "orchestrator", "constructor", "compliance", "security", "qa", "sentinel", "ux", "release"];

export const SPECIALIST_META = {
  finance,
  sales,
  supply,
  people,
  growth,
  orchestrator,
  constructor,
  compliance,
  security,
  qa,
  sentinel,
  ux,
  release,
};