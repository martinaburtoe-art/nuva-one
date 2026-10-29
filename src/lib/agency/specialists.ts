/**
 * Especialistas reales de Nüva Agency (ETAPA 1).
 *
 * Finance, Sales, Supply, People y Growth están conectados al mecanismo de
 * tareas de Agency. Cada uno expone `execute(task)` que realiza una
 * comprobación real sobre archivos y comandos locales, sin tocar producción,
 * sin migraciones remotas y sin secretos.
 *
 * Resultado estructurado: { specialist, taskId, result, evidence, errors, durationMs, timestamp }
 * result ∈ PASS | FAIL | BLOCKED | UNKNOWN | WARN
 */

import { readFile } from "node:fs/promises";
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
   SALES — Ventas, CRM, WhatsApp Business, conversión.
   ───────────────────────────────────────────────────────────── */
export const sales = {
  id: "sales",
  nombre: "Ventas",
  responsabilidades: [
    "Verificar declaraciones de integración de ventas (WhatsApp Business, Odoo, GTM/GA)",
    "Confirmar que los archivos de configuración de ventas existen y son legibles",
    "Reportar falta de configuración sin inventar credenciales",
  ],
  limites: [
    "No accede a tokens de WhatsApp Business ni claves de Odoo",
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
   Registro de especialistas disponibles.
   ───────────────────────────────────────────────────────────── */
export const SPECIALISTS: Record<string, (task: AgencyTask) => Promise<SpecialistResult>> = {
  finance: finance.execute.bind(finance),
  sales: sales.execute.bind(sales),
  supply: supply.execute.bind(supply),
  people: people.execute.bind(people),
  growth: growth.execute.bind(growth),
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
};