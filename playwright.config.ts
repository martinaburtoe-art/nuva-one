import { env } from "node:process";
import { defineConfig, devices } from "@playwright/test";

/**
 * Config mínima de humo E2E (arsenal lote 1, 2026-10-24).
 *
 * - Base URL por defecto: landing desplegada en Vercel (overridable con
 *   E2E_BASE_URL para apuntar a previews).
 * - Solo Chromium: el objetivo de este lote es la spec de humo, no la matriz
 *   completa de navegadores.
 * - Autenticación reutilizable (storageState) y baselines visuales quedan
 *   pendientes para el bloqueador #4 (cuentas de prueba) — ver
 *   docs/arsenal/2026-10-24-batch1.md.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: env.CI ? 1 : 0,
  reporter: env.CI ? "github" : "list",
  use: {
    baseURL: env.E2E_BASE_URL ?? "https://nuva-one.vercel.app",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
