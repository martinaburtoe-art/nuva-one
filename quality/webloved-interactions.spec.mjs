import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";

test.describe("WebLoved interaction layer", () => {
  test("landing interaction surfaces exist without horizontal overflow", async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await expect(page.locator(".nuva-scroll-progress")).toBeAttached();
    await expect(page.locator(".nuva-editorial-nav")).toBeAttached();
    await expect(page.locator(".nuva-floating-contact")).toBeAttached();
    await expect(page.locator(".nuva-page-transition")).toBeAttached();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("mobile navigation opens and closes accessibly", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const menu = page.locator(".nuva-mobile-menu");
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".nuva-mobile-panel")).toHaveClass(/is-open/);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
  });

  test("reduced motion disables interaction animation state", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await expect(page.locator(".nuva-scroll-progress")).toBeAttached();
    const state = await page.evaluate(() => ({
      cursor: document.querySelector(".nuva-cursor"),
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    }));
    expect(state.reduced).toBe(true);
    expect(state.cursor).toBeNull();
  });
});
