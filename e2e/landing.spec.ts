import { expect, test } from "@playwright/test";

/**
 * Spec de humo (arsenal lote 1): la landing pública desplegada responde y
 * mantiene el título del producto. Es la prueba E2E mínima que valida la
 * cadena Playwright + URL real antes de invertir en flujos autenticados
 * (bloqueador #4: faltan cuentas de prueba).
 */
test("la landing pública carga con el título de Nüva One", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Nüva One/);
});
