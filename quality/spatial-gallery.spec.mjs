import { expect, test } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";

test.describe("spatial WebLoved gallery", () => {
  test("mounts the persistent tour without horizontal overflow", async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await expect(page.locator("#nuva-icg-tour")).toBeVisible({ timeout: 15_000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("exposes room map, interactive hotspots and skip-tour CTA", async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const map = page.getByRole("navigation", { name: "Mapa de la empresa" });
    await expect(map).toBeVisible({ timeout: 15_000 });
    await expect(map.getByRole("button")).toHaveCount(9);
    await expect(page.locator(".nuva-icg-tour__hotspots")).toBeVisible();
    await expect(page.locator(".nuva-icg-tour__hotspot")).toHaveCount(3);
    await expect(page.getByRole("link", { name: "Saltar tour ↗" })).toBeVisible();
  });

  test("room navigation changes the active space", async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const map = page.getByRole("navigation", { name: "Mapa de la empresa" });
    await expect(map).toBeVisible({ timeout: 15_000 });
    const buttons = map.getByRole("button");
    await buttons.nth(4).click();
    await expect(buttons.nth(4)).toHaveAttribute("aria-current", "true");
  });

  test("reduced motion keeps the spatial tour usable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await expect(page.locator("#nuva-icg-tour")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("navigation", { name: "Mapa de la empresa" })).toBeVisible();
  });
});
