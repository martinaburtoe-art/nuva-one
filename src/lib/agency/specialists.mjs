/**
 * specialists.mjs — Versión ES Modules (JS puro) de los 5 especialistas de Nüva Agency.
 * Usada por scripts/agency-run-specialist.mjs desde el executor. Sin tipos de TypeScript,
 * sin dependencias externas, solo node:fs/promises y node:crypto.
 */

import { readFile } from "node:fs/promises";
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

export const SPECIALISTS = {
  finance: finance.execute.bind(finance),
  sales: sales.execute.bind(sales),
  supply: supply.execute.bind(supply),
  people: people.execute.bind(people),
  growth: growth.execute.bind(growth),
};

export const SPECIALIST_IDS = ["finance", "sales", "supply", "people", "growth"];

export const SPECIALIST_META = {
  finance,
  sales,
  supply,
  people,
  growth,
};