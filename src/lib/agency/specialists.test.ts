import { describe, it, expect } from "vitest";
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