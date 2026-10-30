import { describe, it, expect, vi } from "vitest";

vi.mock("node:child_process", () => {
  return {
    execFile: vi.fn((cmd: any, args: any[], opts: any, callback: any) => {
      const isVitest = args.some((a) => String(a).includes("vitest"));
      if (isVitest) {
        const fakeOutput = "Test Files  1 passed (1)\n      Tests  39 passed (39)\n";
        callback(null, fakeOutput, "");
        return { kill: () => {}, unref: () => {} } as any;
      }
      // No-vitest: éxito genérico (constructor y release reciben resultado válido)
      callback(null, "", "");
      return { kill: () => {}, unref: () => {} } as any;
    }),
  };
});

import {
  SPECIALISTS,
  SPECIALIST_META,
  type SpecialistResult,
} from "@/lib/agency/specialists";

const task = (agentId: string, id = "t-test-001") =>
  ({ id, title: "Tarea de prueba", agent_id: agentId } as const);

describe("Especialistas faltantes (ETAPA 1)", () => {
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
    const result: SpecialistResult = await SPECIALISTS[id](task(id));
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
    const result: SpecialistResult = await SPECIALISTS[id](task(id));
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

  it("orchestrator selecciona tarea elegante del backlog", async () => {
    const result = await SPECIALISTS.orchestrator(task("orchestrator"));
    expect(["PASS", "WARN", "BLOCKED"]).toContain(result.result);
    const joined = result.evidence.join(" ");
    expect(joined).toMatch(/tareas PENDIENTE|tareas elegibles|seleccionada/);
  });

  it("constructor verifica sintaxis de archivo ejecutable", async () => {
    const result = await SPECIALISTS.constructor(task("constructor"));
    expect(["PASS", "FAIL", "BLOCKED"]).toContain(result.result);
    const joined = result.evidence.join(" ");
    expect(joined).toMatch(/node --check|sintaxis/);
  });

  it("compliance verifica DECISIONS.md y backlog", async () => {
    const result = await SPECIALISTS.compliance(task("compliance"));
    expect(["PASS", "WARN", "BLOCKED"]).toContain(result.result);
    const joined = result.evidence.join(" ");
    expect(joined).toMatch(/DECISIONS\.md|backlog/);
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

  it("qa ejecuta vitest y reporta conteo", async () => {
    const result = await SPECIALISTS.qa(task("qa"));
    expect(["PASS", "FAIL", "WARN"]).toContain(result.result);
    const joined = result.evidence.join(" ");
    expect(joined).toMatch(/pruebas pasadas|pruebas fallidas|código de salida/);
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