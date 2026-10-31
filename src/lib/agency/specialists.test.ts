import { readFile } from "node:fs/promises";
import { describe, it, expect } from "vitest";

import {
  SPECIALISTS,
  SPECIALIST_META,
  type SpecialistResult,
} from "@/lib/agency/specialists";

const task = (agentId: string, id = "t-test-001", input_context?: Record<string, unknown>) =>
  ({ id, title: "Tarea de prueba", agent_id: agentId, input_context } as const);

describe("Especialistas faltantes (ETAPA 1)", () => {
  it("registra exactamente los 13 especialistas", () => {
    const expected = ["compliance", "constructor", "finance", "growth", "orchestrator", "people", "qa", "release", "sales", "security", "sentinel", "supply", "ux"];
    expect(Object.keys(SPECIALISTS).sort()).toEqual(expected);
    expect(Object.keys(SPECIALIST_META).sort()).toEqual(expected);
  });


  it.each([
    ["finance"],
    ["sales"],
    ["supply"],
    ["people"],
    ["growth"],
  ])("%s expone metadatos completos", (id) => {
    const meta = SPECIALIST_META[id];
    expect(meta).toBeDefined();
    expect(meta.id).toBe(id);
    expect(Array.isArray(meta.responsabilidades)).toBe(true);
    expect(meta.responsabilidades.length).toBeGreaterThan(0);
    expect(Array.isArray(meta.limites)).toBe(true);
    expect(meta.limites.length).toBeGreaterThan(0);
    expect(Array.isArray(meta.tiposDeTarea)).toBe(true);
    expect(meta.tiposDeTarea.length).toBeGreaterThan(0);
    expect(Array.isArray(meta.herramientasPermitidas)).toBe(true);
    expect(meta.herramientasPermitidas.length).toBeGreaterThan(0);
  });

  it.each([
    ["finance"],
    ["sales"],
    ["supply"],
    ["people"],
    ["growth"],
  ])("%s ejecuta y devuelve resultado estructurado válido", async (id) => {
    const result: SpecialistResult = await SPECIALISTS[id](task(id, "t-test-001", id === "qa" ? { target: "tests/agency/qa-smoke.test.ts" } : undefined));
    expect(result.specialist).toBe(id);
    expect(result.taskId).toBe(task(id).id);
    expect(["PASS", "FAIL", "BLOCKED", "UNKNOWN", "WARN"]).toContain(result.result);
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(typeof result.durationMs).toBe("number");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("finance detecta lockfiles y reporta estado real", async () => {
    const result = await SPECIALISTS.finance(task("finance"));
    expect(["PASS", "WARN", "FAIL"]).toContain(result.result);
    expect(result.evidence.some((e) => e.includes("package.json"))).toBe(true);
    expect(result.evidence.some((e) => e.includes("bun.lock") || e.includes("package-lock"))).toBe(true);
  });

  it("sales verifica configuración de integraciones", async () => {
    const result = await SPECIALISTS.sales(task("sales"));
    expect(["PASS", "WARN"]).toContain(result.result);
    expect(result.evidence.some((e) => e.includes("odoo") || e.includes("gtm"))).toBe(true);
  });

  it("supply verifica tablas del esquema de agency en migración", async () => {
    const result = await SPECIALISTS.supply(task("supply"));
    expect(["PASS", "FAIL"]).toContain(result.result);
    expect(result.evidence.some((e) => e.includes("agency_tasks"))).toBe(true);
    expect(result.evidence.some((e) => e.includes("agency_missions"))).toBe(true);
  });

  it("people ejecuta sin exponer PII", async () => {
    const result = await SPECIALISTS.people(task("people"));
    expect(result.result).toBe("PASS");
    const joined = result.evidence.join(" ");
    expect(joined).not.toMatch(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  });

  it("growth verifica cron jobs en vercel.json", async () => {
    const result = await SPECIALISTS.growth(task("growth"));
    expect(["PASS", "WARN"]).toContain(result.result);
    expect(result.evidence.some((e) => e.includes("vercel.json"))).toBe(true);
  });
});

describe("Especialistas nuevos (ETAPA 1 — orchestrator, constructor, compliance, security, qa, sentinel, ux, release)", () => {
  it.each([
    ["orchestrator"],
    ["constructor"],
    ["compliance"],
    ["security"],
    ["qa"],
    ["sentinel"],
    ["ux"],
    ["release"],
  ])("%s expone metadatos completos", (id) => {
    const meta = SPECIALIST_META[id];
    expect(meta).toBeDefined();
    expect(meta.id).toBe(id);
    expect(Array.isArray(meta.responsabilidades)).toBe(true);
    expect(meta.responsabilidades.length).toBeGreaterThan(0);
    expect(Array.isArray(meta.limites)).toBe(true);
    expect(meta.limites.length).toBeGreaterThan(0);
    expect(Array.isArray(meta.tiposDeTarea)).toBe(true);
    expect(meta.tiposDeTarea.length).toBeGreaterThan(0);
    expect(Array.isArray(meta.herramientasPermitidas)).toBe(true);
    expect(meta.herramientasPermitidas.length).toBeGreaterThan(0);
  });

  it.each([
    ["orchestrator"],
    ["constructor"],
    ["compliance"],
    ["security"],
    ["qa"],
    ["sentinel"],
    ["ux"],
    ["release"],
  ])("%s ejecuta y devuelve resultado estructurado válido", async (id) => {
    const result: SpecialistResult = await SPECIALISTS[id](task(id, "t-test-001", id === "qa" ? { target: "tests/agency/qa-smoke.test.ts" } : undefined));
    expect(result.specialist).toBe(id);
    expect(result.taskId).toBe(task(id).id);
    expect(["PASS", "FAIL", "BLOCKED", "UNKNOWN", "WARN"]).toContain(result.result);
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(typeof result.durationMs).toBe("number");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("orchestrator cuenta las tareas reales del backlog y verifica dependencias", async () => {
    const backlog = await readFile("docs/nuva-agency/AGENT_BACKLOG.md", "utf8");
    const expectedPending = backlog
      .split(/^## T-\d+ — /m)
      .slice(1)
      .filter((block) => /^- estado: PENDIENTE$/m.test(block)).length;

    const result = await SPECIALISTS.orchestrator(task("orchestrator"));
    const pendingEvidence = result.evidence.find((item) => item.startsWith("tareas PENDIENTE:"));
    const eligibleEvidence = result.evidence.find((item) => item.startsWith("tareas elegibles"));

    expect(pendingEvidence).toBe(`tareas PENDIENTE: ${expectedPending}`);
    expect(eligibleEvidence).toBeDefined();
    expect(["PASS", "WARN", "BLOCKED"]).toContain(result.result);
    if (expectedPending === 0) expect(result.result).toBe("WARN");
  });

  it("constructor verifica sintaxis de archivo ejecutable", async () => {
    const result = await SPECIALISTS.constructor(task("constructor"));
    expect(["PASS", "FAIL", "BLOCKED"]).toContain(result.result);
    const joined = result.evidence.join(" ");
    expect(joined).toMatch(/node --check|sintaxis/);
  });

  it("compliance valida DECISIONS.md y el formato real del backlog", async () => {
    const result = await SPECIALISTS.compliance(task("compliance"));
    expect(["PASS", "WARN", "BLOCKED"]).toContain(result.result);
    const joined = result.evidence.join(" ");
    expect(joined).toMatch(/DECISIONS\.md/);
    expect(joined).toMatch(/backlog leído/);
    expect(joined).toMatch(/tareas sin estado definido: 0/);
  });

  it("security escanea archivos .env y verifica autorización", async () => {
    const result = await SPECIALISTS.security(task("security"));
    expect(["PASS", "WARN"]).toContain(result.result);
    const joined = result.evidence.join(" ");
    expect(joined).toMatch(/\.env|agency-control/);
    // Nunca debe exponer secretos reales
    expect(joined).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
    expect(joined).not.toMatch(/service_role/);
  });

  it("qa ejecuta Vitest real en un objetivo aislado y reporta conteo verificable", async () => {
    const result = await SPECIALISTS.qa(task("qa", "t-qa-smoke", { target: "tests/agency/qa-smoke.test.ts" }));
    expect(result.result).toBe("PASS");
    const joined = result.evidence.join(" ");
    expect(joined).toMatch(/pruebas: 1\/1 aprobadas; 0 fallidas/);
    expect(joined).toMatch(/salida JSON válida/);
  });

  it("sentinel escanea logs y detecta pausa", async () => {
    const result = await SPECIALISTS.sentinel(task("sentinel"));
    expect(["PASS", "WARN"]).toContain(result.result);
    const joined = result.evidence.join(" ");
    expect(joined).toMatch(/ejecuciones en logs|\.agency-pause/);
  });

  it("ux inspecciona rutas y accesibilidad", async () => {
    const result = await SPECIALISTS.ux(task("ux"));
    expect(["PASS", "BLOCKED"]).toContain(result.result);
    const joined = result.evidence.join(" ");
    expect(joined).toMatch(/archivos|accesibilidad/);
  });

  it("release verifica estado de git y rama", async () => {
    const result = await SPECIALISTS.release(task("release"));
    expect(["PASS", "FAIL"]).toContain(result.result);
    const joined = result.evidence.join(" ");
    expect(joined).toMatch(/git status|package\.json/);
  });
});