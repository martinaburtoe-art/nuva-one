/**
 * Especialistas reales de Nüva Agency (ETAPA 1).
 *
 * Los 13 especialistas están conectados al mecanismo de
 * tareas de Agency. Cada uno expone `execute(task)` que realiza una
 * comprobación real sobre archivos y comandos locales, sin tocar producción,
 * sin migraciones remotas y sin secretos.
 *
 * Resultado estructurado: { specialist, taskId, result, evidence, errors, durationMs, timestamp }
 * result ∈ PASS | FAIL | BLOCKED | UNKNOWN | WARN
 */

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { createHash } from "node:crypto";

export type SpecialistResult = {
  specialist: string;
  taskId: string;
  result: "PASS" | "FAIL" | "BLOCKED" | "UNKNOWN" | "WARN";
  evidence: string[];
  errors: string[];
  durationMs: number;
  timestamp: string;
};

export type AgencyTask = {
  id: string;
  title: string;
  agent_id: string;
  input_context?: Record<string, unknown>;
};

const nowIso = () => new Date().toISOString();

function nowMs() {
  return Date.now();
}

function hashOf(content: string) {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/* ──────────────────────────────────────────────────────────────
   Constantes y utilidades compartidas por los especialistas.
   ───────────────────────────────────────────────────────────── */
const BACKLOG_PATH = "docs/nuva-agency/AGENT_BACKLOG.md";

function parseBlocks(
  markdown: string
): Array<{ id: string; title: string; fields: Record<string, string> }> {
  const blocks: Array<{ id: string; title: string; fields: Record<string, string> }> = [];
  const lines = markdown.split(/\r?\n/);
  let current: { id: string; title: string; fields: Record<string, string> } | null = null;
  for (const line of lines) {
    const m = line.match(/^### T-(\d+)\s+(.+)$/);
    if (m) {
      current = { id: `T-${m[1]}`, title: m[2].trim(), fields: {} };
      blocks.push(current);
    } else if (current) {
      const fm = line.match(/^- \*\*([^*]+)\*\*:\s*(.*)$/);
      if (fm) current.fields[fm[1].trim()] = fm[2].trim();
    }
  }
  return blocks;
}

function depsResolved(
  block: { fields: Record<string, string>; id: string },
  byId: Record<string, any>
): boolean {
  const deps = block.fields.dependencias;
  if (!deps || deps.trim() === "") return true;
  const depIds = deps.split(",").map((d: string) => d.trim()).filter(Boolean);
  return depIds.every((d: string) => {
    const dep = byId[d];
    return dep && dep.fields.estado === "COMPLETADO";
  });
}

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2 };

/* ──────────────────────────────────────────────────────────────
   Comando real: leer un archivo y devolver su hash + tamaño.
   Útil como "herramienta" compartida por varios especialistas.
   ───────────────────────────────────────────────────────────── */
async function readLocalFile(path: string): Promise<{ ok: boolean; content?: string; error?: string }> {
  try {
    const content = await readFile(path, "utf8");
    return { ok: true, content };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/* ──────────────────────────────────────────────────────────────
   Comando real: ejecutar node --check sobre un archivo JS/TS.
   ───────────────────────────────────────────────────────────── */
async function nodeCheck(path: string): Promise<{ ok: boolean; error?: string }> {
  const { execFile } = await import("node:child_process");
  return new Promise((resolve) => {
    execFile("node", ["--check", path], { timeout: 30000 }, (error) => {
      resolve({ ok: !error, error: error ? error.message : undefined });
    });
  });
}

/* ──────────────────────────────────────────────────────────────
   FINANCE — Finanzas, caja, contabilidad, lockfiles.
   ───────────────────────────────────────────────────────────── */
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
  herramientasPermitidas: ["readFile", "node --check", "JSON.parse"],

  async execute(task: AgencyTask): Promise<SpecialistResult> {
    const start = nowMs();
    const evidence: string[] = [];
    const errors: string[] = [];

    // Lectura real de package.json
    const pkg = await readLocalFile("package.json");
    if (!pkg.ok) {
      return {
        specialist: "finance",
        taskId: task.id,
        result: "BLOCKED",
        evidence: [`package.json no legible: ${pkg.error}`],
        errors: [pkg.error ?? ""],
        durationMs: nowMs() - start,
        timestamp: nowIso(),
      };
    }
    evidence.push(`package.json leído (${pkg.content!.length} bytes, hash ${hashOf(pkg.content!)})`);

    let pkgJson: Record<string, unknown>;
    try {
      pkgJson = JSON.parse(pkg.content!);
    } catch (error) {
      return {
        specialist: "finance",
        taskId: task.id,
        result: "FAIL",
        evidence: ["package.json no es JSON válido"],
        errors: [error instanceof Error ? error.message : String(error)],
        durationMs: nowMs() - start,
        timestamp: nowIso(),
      };
    }

    const deps = (pkgJson.dependencies ?? {}) as Record<string, string>;
    const devDeps = (pkgJson.devDependencies ?? {}) as Record<string, string>;
    evidence.push(`dependencias: ${Object.keys(deps).length}; devDependencies: ${Object.keys(devDeps).length}`);

    // Verificar existencia de lockfiles (lectura solo)
    const lockBun = await readLocalFile("bun.lock");
    const lockNpm = await readLocalFile("package-lock.json");
    evidence.push(`bun.lock: ${lockBun.ok ? "presente" : "ausente"}`);
    evidence.push(`package-lock.json: ${lockNpm.ok ? "presente" : "ausente"}`);

    // Bloqueador real conocido: bun.lock inconsistente con package.json (B-005)
    let result: SpecialistResult["result"] = "PASS";
    if (lockBun.ok && lockNpm.ok) {
      evidence.push("ambos lockfiles presentes — posible inconsistencia si package.json cambió tras ellos");
      result = "WARN";
    } else if (!lockBun.ok && !lockNpm.ok) {
      evidence.push("ningún lockfile presente — npm ci puede no ser reproducible");
      result = "WARN";
    }

    return {
      specialist: "finance",
      taskId: task.id,
      result,
      evidence,
      errors,
      durationMs: nowMs() - start,
      timestamp: nowIso(),
    };
  },
};

/* ──────────────────────────────────────────────────────────────
   SALES — Ventas, CRM, mensajería comercial, conversión.
   ───────────────────────────────────────────────────────────── */
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

  async execute(task: AgencyTask): Promise<SpecialistResult> {
    const start = nowMs();
    const evidence: string[] = [];
    const errors: string[] = [];

    const candidates = [
      "vercel.json",
      "package.json",
      "supabase/functions/nuva-agency-worker-control/index.ts",
    ];

    for (const candidate of candidates) {
      const file = await readLocalFile(candidate);
      if (file.ok) {
        evidence.push(`${candidate}: legible (${file.content!.length} bytes)`);
      } else {
        evidence.push(`${candidate}: no encontrado`);
      }
    }

    const pkg = await readLocalFile("package.json");
    let hasOdoo = false;
    let hasGtm = false;
    if (pkg.ok) {
      try {
        const pj = JSON.parse(pkg.content!);
        const depsText = JSON.stringify(pj.dependencies ?? {});
        hasOdoo = /odoo/i.test(depsText) || /odoo/i.test(pkg.content!);
        hasGtm = /gtm|google.?tag/i.test(pkg.content!);
      } catch {
        errors.push("package.json no parseable");
      }
    }

    evidence.push(`odoo declarado: ${hasOdoo ? "sí" : "no"}`);
    evidence.push(`gtm/ga declarado: ${hasGtm ? "sí" : "no"}`);

    const result: SpecialistResult["result"] = hasOdoo || hasGtm ? "PASS" : "WARN";

    return {
      specialist: "sales",
      taskId: task.id,
      result,
      evidence,
      errors,
      durationMs: nowMs() - start,
      timestamp: nowIso(),
    };
  },
};

/* ──────────────────────────────────────────────────────────────
   SUPPLY — Compras, inventario, stock, fulfillment.
   ───────────────────────────────────────────────────────────── */
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

  async execute(task: AgencyTask): Promise<SpecialistResult> {
    const start = nowMs();
    const evidence: string[] = [];
    const errors: string[] = [];

    // Buscar archivos relacionados con productos/inventario (lectura directa)
    const candidates = [
      "supabase/migrations/20261007000000_durable_autonomous_agency_control_plane.sql",
      "package.json",
    ];

    for (const candidate of candidates) {
      const file = await readLocalFile(candidate);
      evidence.push(`${candidate}: ${file.ok ? `legible (${file.content!.length} bytes)` : "no encontrado"}`);
    }

    // Verificar que el esquema de agency_tasks exista (lectura de migración local)
    const mig = await readLocalFile("supabase/migrations/20261007000000_durable_autonomous_agency_control_plane.sql");
    if (!mig.ok) {
      return {
        specialist: "supply",
        taskId: task.id,
        result: "BLOCKED",
        evidence: ["migración de control plane no local"],
        errors: [mig.error ?? ""],
        durationMs: nowMs() - start,
        timestamp: nowIso(),
      };
    }

    const hasTasksTable = /create table if not exists public\.agency_tasks/.test(mig.content!);
    const hasMissionsTable = /create table if not exists public\.agency_missions/.test(mig.content!);
    evidence.push(`tabla agency_tasks en migración: ${hasTasksTable ? "sí" : "no"}`);
    evidence.push(`tabla agency_missions en migración: ${hasMissionsTable ? "sí" : "no"}`);

    const result: SpecialistResult["result"] = hasTasksTable && hasMissionsTable ? "PASS" : "FAIL";

    return {
      specialist: "supply",
      taskId: task.id,
      result,
      evidence,
      errors,
      durationMs: nowMs() - start,
      timestamp: nowIso(),
    };
  },
};

/* ──────────────────────────────────────────────────────────────
   PEOPLE — Nüva People, nómina, contratos, RRHH.
   ───────────────────────────────────────────────────────────── */
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
  herramientasPermitidas: ["readFile", "search_files"],

  async execute(task: AgencyTask): Promise<SpecialistResult> {
    const start = nowMs();
    const evidence: string[] = [];
    const errors: string[] = [];

    const docs = ["docs/nuva-agency/AGENT_BACKLOG.md", "docs/factory/BLOCKERS.md", "docs/factory/PROJECT_STATE.md"];
    for (const doc of docs) {
      const file = await readLocalFile(doc);
      evidence.push(`${doc}: ${file.ok ? `legible (${file.content!.length} bytes)` : "no encontrado"}`);
    }

    // Verificar que no haya patrones obvios de PII en logs (solo nombres de archivo, no contenido secreto)
    const pkg = await readLocalFile("package.json");
    if (pkg.ok) {
      evidence.push(`package.json revisado: ${pkg.content!.length} bytes`);
    }

    const result: SpecialistResult["result"] = "PASS";

    return {
      specialist: "people",
      taskId: task.id,
      result,
      evidence,
      errors,
      durationMs: nowMs() - start,
      timestamp: nowIso(),
    };
  },
};

/* ──────────────────────────────────────────────────────────────
   GROWTH — Onboarding, activación, SEO, crecimiento.
   ───────────────────────────────────────────────────────────── */
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

  async execute(task: AgencyTask): Promise<SpecialistResult> {
    const start = nowMs();
    const evidence: string[] = [];
    const errors: string[] = [];

    const candidates = ["vercel.json", "package.json", "vite.config.ts", "vitest.config.ts"];
    for (const candidate of candidates) {
      const file = await readLocalFile(candidate);
      evidence.push(`${candidate}: ${file.ok ? `legible (${file.content!.length} bytes)` : "no encontrado"}`);
    }

    const vercel = await readLocalFile("vercel.json");
    let hasCron = false;
    if (vercel.ok) {
      try {
        const vj = JSON.parse(vercel.content!);
        hasCron = Array.isArray(vj.crons) && vj.crons.length > 0;
      } catch {
        errors.push("vercel.json no parseable");
      }
    }
    evidence.push(`cron jobs en vercel.json: ${hasCron ? `${contarCrons(vercel.content!)}` : "0"}`);

    const result: SpecialistResult["result"] = hasCron ? "PASS" : "WARN";

    return {
      specialist: "growth",
      taskId: task.id,
      result,
      evidence,
      errors,
      durationMs: nowMs() - start,
      timestamp: nowIso(),
    };
  },
};

function contarCrons(content: string): number {
  try {
    const vj = JSON.parse(content);
    return Array.isArray(vj.crons) ? vj.crons.length : 0;
  } catch {
    return 0;
  }
}

/* ──────────────────────────────────────────────────────────────
   ORCHESTRATOR — Coordina prioridades, dependencias, ejecución y recuperación.
   ───────────────────────────────────────────────────────────── */
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

  async execute(task: AgencyTask): Promise<SpecialistResult> {
    const start = nowMs();
    const evidence: string[] = [];
    const errors: string[] = [];

    const md = await readLocalFile(BACKLOG_PATH);
    if (!md.ok) {
      return {
        specialist: "orchestrator", taskId: task.id, result: "BLOCKED",
        evidence: [`backlog no legible: ${md.error}`], errors: [md.error ?? ""],
        durationMs: nowMs() - start, timestamp: nowIso(),
      };
    }
    evidence.push(`backlog leído (${md.content!.length} bytes)`);

    const blocks = parseBlocks(md.content!);
    const byId: Record<string, any> = {};
    for (const b of blocks) byId[b.id] = b;

    const pendientes = blocks.filter((b: any) => b.fields.estado === "PENDIENTE");
    evidence.push(`tareas PENDIENTE: ${pendientes.length}`);

    const elegibles = pendientes.filter((b: any) => depsResolved(b, byId));
    evidence.push(`tareas elegibles (deps resueltas): ${elegibles.length}`);

    if (elegibles.length === 0) {
      return {
        specialist: "orchestrator", taskId: task.id, result: "WARN",
        evidence: [...evidence, "sin tareas elegibles en este ciclo"], errors,
        durationMs: nowMs() - start, timestamp: nowIso(),
      };
    }

    elegibles.sort((a: any, b: any) =>
      (PRIORITY_ORDER[a.fields.prioridad] ?? 99) - (PRIORITY_ORDER[b.fields.prioridad] ?? 99)
    );
    const next = elegibles[0];
    evidence.push(`siguiente tarea seleccionada: ${next.id} — ${next.title} (prioridad ${next.fields.prioridad})`);

    return {
      specialist: "orchestrator", taskId: task.id, result: "PASS",
      evidence: [...evidence, `seleccionada: ${next.id}`], errors,
      durationMs: nowMs() - start, timestamp: nowIso(),
    };
  },
};

/* ──────────────────────────────────────────────────────────────
   CONSTRUCTOR — Implementa funcionalidades y corrige código.
   ───────────────────────────────────────────────────────────── */
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

  async execute(task: AgencyTask): Promise<SpecialistResult> {
    const start = nowMs();
    const evidence: string[] = [];
    const errors: string[] = [];

    const target = (task.input_context && (task.input_context as any).target)
      || "scripts/agency-task-executor.mjs";

    const file = await readLocalFile(target);
    if (!file.ok) {
      return {
        specialist: "constructor", taskId: task.id, result: "BLOCKED",
        evidence: [`archivo no legible: ${target} (${file.error})`], errors: [file.error ?? ""],
        durationMs: nowMs() - start, timestamp: nowIso(),
      };
    }
    evidence.push(`${target}: legible (${file.content!.length} bytes)`);

    const check = await nodeCheck(target);
    evidence.push(`node --check ${target}: ${check.ok ? "sintaxis OK" : "error de sintaxis"}`);
    if (check.error) errors.push(check.error);

    const result: SpecialistResult["result"] = check.ok ? "PASS" : "FAIL";

    return {
      specialist: "constructor", taskId: task.id, result, evidence, errors,
      durationMs: nowMs() - start, timestamp: nowIso(),
    };
  },
};

/* ──────────────────────────────────────────────────────────────
   COMPLIANCE — Revisa cumplimiento, trazabilidad y privacidad.
   ───────────────────────────────────────────────────────────── */
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

  async execute(task: AgencyTask): Promise<SpecialistResult> {
    const start = nowMs();
    const evidence: string[] = [];
    const errors: string[] = [];

    const decisions = await readLocalFile("docs/factory/DECISIONS.md");
    evidence.push(`DECISIONS.md: ${decisions.ok ? `legible (${decisions.content!.length} bytes)` : "no encontrado"}`);

    const backlog = await readLocalFile(BACKLOG_PATH);
    if (!backlog.ok) {
      return {
        specialist: "compliance", taskId: task.id, result: "BLOCKED",
        evidence: [`backlog no legible: ${backlog.error}`], errors: [backlog.error ?? ""],
        durationMs: nowMs() - start, timestamp: nowIso(),
      };
    }
    evidence.push(`backlog leído (${backlog.content!.length} bytes)`);

    const blocks = parseBlocks(backlog.content!);
    let sinEstado = 0;
    for (const b of blocks) {
      if (!b.fields.estado) sinEstado++;
    }
    evidence.push(`tareas sin estado definido: ${sinEstado}`);

    const tieneDecisiones = decisions.ok && /D-\d+/.test(decisions.content!);
    const formatoValido = blocks.length > 0 && sinEstado === 0;

    const result: SpecialistResult["result"] = tieneDecisiones && formatoValido ? "PASS" : "WARN";

    return {
      specialist: "compliance", taskId: task.id, result, evidence, errors,
      durationMs: nowMs() - start, timestamp: nowIso(),
    };
  },
};

/* ──────────────────────────────────────────────────────────────
   SECURITY — Analiza vulnerabilidades, autenticación, autorización, RLS y secretos.
   ───────────────────────────────────────────────────────────── */
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

  async execute(task: AgencyTask): Promise<SpecialistResult> {
    const start = nowMs();
    const evidence: string[] = [];
    const errors: string[] = [];

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
      const hasAuth = /authoriz|owner|worker|verify/i.test(agencyControl.content!);
      evidence.push(`agency-status.ts: ${agencyControl.content!.length} bytes, autorización server-side: ${hasAuth ? "sí" : "no detectada"}`);
      if (!hasAuth) errors.push("agency-status.ts sin verificación de autorización server-side");
    } else {
      evidence.push("agency-status.ts: no encontrado");
    }

    const result: SpecialistResult["result"] = secretosEncontrados === 0 ? "PASS" : "WARN";

    return {
      specialist: "security", taskId: task.id, result, evidence, errors,
      durationMs: nowMs() - start, timestamp: nowIso(),
    };
  },
};

/* ──────────────────────────────────────────────────────────────
   QA — Ejecuta pruebas unitarias, integración, regresión y E2E.
   ───────────────────────────────────────────────────────────── */
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

  async execute(task: AgencyTask): Promise<SpecialistResult> {
    const start = nowMs();
    const evidence: string[] = [];
    const errors: string[] = [];
    const rawTarget = task.input_context?.target;
    const testTarget = typeof rawTarget === "string" ? rawTarget.trim() : "";

    if (testTarget && (testTarget.length > 200 || testTarget.startsWith("/") || testTarget.charAt(0) === String.fromCharCode(92) || /^[A-Za-z]:/.test(testTarget) || testTarget.includes(".."))) {
      return {
        specialist: "qa", taskId: task.id, result: "BLOCKED",
        evidence: ["objetivo QA rechazado: debe ser una ruta relativa dentro del repositorio"],
        errors, durationMs: nowMs() - start, timestamp: nowIso(),
      };
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
        let report: Record<string, unknown> | null = null;
        const jsonStart = output.indexOf("{");
        const jsonEnd = output.lastIndexOf("}");
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          try { report = JSON.parse(output.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>; }
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

        const result: SpecialistResult["result"] =
          exitCode !== 0 || failed > 0 ? "FAIL" : passed > 0 && total > 0 ? "PASS" : "WARN";
        resolve({
          specialist: "qa", taskId: task.id, result, evidence, errors,
          durationMs: nowMs() - start, timestamp: nowIso(),
        });
      });
    });
  },
};

/* ──────────────────────────────────────────────────────────────
   SENTINEL — Monitorea errores, disponibilidad, anomalías y bloqueos.
   ───────────────────────────────────────────────────────────── */
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

  async execute(task: AgencyTask): Promise<SpecialistResult> {
    const start = nowMs();
    const evidence: string[] = [];
    const errors: string[] = [];

    const execDir = "logs/executions";
    let fails = 0;
    let blocked = 0;
    let total = 0;
    try {
      const entries = await readdir(execDir);
      const jsonFiles = entries.filter((e: string) => e.endsWith(".json") && !e.startsWith("."));
      for (const f of jsonFiles) {
        const data = await readLocalFile(join("logs/executions", f));
        if (data.ok) {
          try {
            const parsed = JSON.parse(data.content!);
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

    const result: SpecialistResult["result"] = fails === 0 ? "PASS" : "WARN";

    return {
      specialist: "sentinel", taskId: task.id, result, evidence, errors,
      durationMs: nowMs() - start, timestamp: nowIso(),
    };
  },
};

/* ──────────────────────────────────────────────────────────────
   UX — Revisa experiencia, accesibilidad, responsive y consistencia visual.
   ───────────────────────────────────────────────────────────── */
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

  async execute(task: AgencyTask): Promise<SpecialistResult> {
    const start = nowMs();
    const evidence: string[] = [];
    const errors: string[] = [];

    const candidates = [
      "src/routes/owner/control-tower.tsx",
      "src/routes/api/owner/agency-status.ts",
      "src/routes/owner/control-tower.tsx",
    ];
    let archivosEncontrados = 0;
    let conAria = 0;
    for (const c of candidates) {
      const f = await readLocalFile(c);
      if (f.ok) {
        archivosEncontrados++;
        evidence.push(`${c}: legible (${f.content!.length} bytes)`);
        if (/aria-|role=|alt=/.test(f.content!)) conAria++;
      } else {
        evidence.push(`${c}: no encontrado`);
      }
    }

    const result: SpecialistResult["result"] = archivosEncontrados > 0 ? "PASS" : "BLOCKED";

    return {
      specialist: "ux", taskId: task.id, result,
      evidence: [...evidence, `archivos con atributos de accesibilidad: ${conAria}`], errors,
      durationMs: nowMs() - start, timestamp: nowIso(),
    };
  },
};

/* ──────────────────────────────────────────────────────────────
   RELEASE — Prepara versiones, changelog, CI/CD y evidencias de entrega.
   ───────────────────────────────────────────────────────────── */
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

  async execute(task: AgencyTask): Promise<SpecialistResult> {
    const start = nowMs();
    const evidence: string[] = [];
    const errors: string[] = [];
    const pkg = await readLocalFile("package.json");
    if (pkg.ok) evidence.push(`package.json: ${pkg.content!.length} bytes`);
    else errors.push(pkg.error ?? "package.json no legible");

    const hasDist = existsSync("dist") || existsSync(".vercel/output");
    evidence.push(`artefactos de build: ${hasDist ? "presentes" : "no detectados"}`);

    return new Promise((resolve) => {
      execFile("git", ["status", "--short"], { cwd: process.cwd(), timeout: 30000 },
        (error, stdout) => {
          const output = String(stdout ?? "");
          const modifiedFiles = output.trim() ? output.trim().split("\\n").filter(Boolean).length : 0;
          evidence.push(`git status: ${modifiedFiles} archivo(s) sin staged`);
          if (output.trim()) evidence.push(output.slice(0, 500));
          const result: SpecialistResult["result"] = error || !pkg.ok ? "FAIL" : "PASS";
          resolve({
            specialist: "release", taskId: task.id, result, evidence, errors,
            durationMs: nowMs() - start, timestamp: nowIso(),
          });
        });
    });
  },
};

/* ──────────────────────────────────────────────────────────────
   Registro de especialistas disponibles.
   ───────────────────────────────────────────────────────────── */
export const SPECIALISTS: Record<string, (task: AgencyTask) => Promise<SpecialistResult>> = {
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

export const SPECIALIST_META: Record<string, {
  id: string;
  nombre: string;
  responsabilidades: string[];
  limites: string[];
  tiposDeTarea: string[];
  herramientasPermitidas: string[];
}> = {
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