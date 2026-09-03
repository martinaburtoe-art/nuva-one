import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";

test.describe("Nüva company visit tour", () => {
  test("renders the spatial tour with nine rooms and no horizontal overflow", async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const tour = page.locator("#company-tour");
    await expect(tour).toBeVisible();
    await expect(tour.locator(".nuva-company-tour__scene")).toHaveCount(9);
    await expect(tour.locator(".nuva-company-tour__map button")).toHaveCount(9);
    await expect(page.locator("body")).toHaveCSS("overflow-x", /.+/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("advances through rooms with the guided control and hotspot", async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const tour = page.locator("#company-tour");
    await expect(tour.locator(".nuva-company-tour__eyebrow")).toContainText("Dashboard / 01");
    await tour.getByRole("button", { name: /Siguiente sala/ }).click();
    await expect(tour.locator(".nuva-company-tour__eyebrow")).toContainText("CRM / 02");
    await tour.locator(".nuva-company-tour__hotspot").first().click();
    await expect(tour.locator(".nuva-company-tour__eyebrow")).toContainText("Inventario + Compras / 03");
  });

  test("supports mobile swipe navigation and keeps controls accessible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const tour = page.locator("#company-tour");
    await expect(tour).toBeVisible();
    await expect(tour.getByRole("button", { name: /Siguiente sala/ })).toBeVisible();
    const stage = tour.locator(".nuva-company-tour__stage");
    await stage.dispatchEvent("touchstart", { touches: [{ clientY: 620 }] });
    await stage.dispatchEvent("touchend", { changedTouches: [{ clientY: 420 }] });
    await expect(tour.locator(".nuva-company-tour__eyebrow")).toContainText("CRM / 02");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
