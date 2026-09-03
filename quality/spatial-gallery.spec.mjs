import { expect, test } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";

test.describe("spatial WebLoved gallery", () => {
  test("mounts the persistent tour without horizontal overflow", async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await expect(page.locator("#nuva-spatial-gallery")).toBeVisible({ timeout: 15_000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("exposes accessible room navigation and skip-tour CTA", async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const map = page.getByRole("navigation", { name: "Mapa del recorrido" });
    await expect(map).toBeVisible({ timeout: 15_000 });
    await expect(map.getByRole("button")).toHaveCount(9);
    await expect(page.getByRole("link", { name: "Saltar tour ↗" })).toBeVisible();
  });

  test("reduced motion keeps the spatial tour usable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await expect(page.locator("#nuva-spatial-gallery")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("navigation", { name: "Mapa del recorrido" })).toBeVisible();
  });
});
