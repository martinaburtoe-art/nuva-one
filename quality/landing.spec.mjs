import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
test.use({ baseURL });

async function attachRuntimeGuards(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

async function expectHealthyPage(page, path) {
  const response = await page.goto(path, { waitUntil: 'networkidle' });
  expect(response, `${path} must return a response`).not.toBeNull();
  expect(response.ok(), `${path} returned HTTP ${response.status()}`).toBe(true);
  await expect(page.locator('body')).toBeVisible({ timeout: 20000 });
}

async function expectAccessible(page, path, { disableRules = [] } = {}) {
  const builder = new AxeBuilder({ page });
  if (disableRules.length) builder.disableRules(disableRules);
  const results = await builder.analyze();
  expect(results.violations, `${path} has accessibility violations`).toEqual([]);
}

async function expectDemoAccessible(page) {
  const main = page.locator('main').first();
  const results = await new AxeBuilder({ page }).include('main').analyze();
  expect(results.violations, '/demo main content has accessibility violations').toEqual([]);
  await expect(main).toBeVisible();
}

test('landing smoke, accessibility and performance budget', async ({ page }) => {
  const { consoleErrors, pageErrors } = await attachRuntimeGuards(page);
  await expectHealthyPage(page, '/');
  await expect(page.locator('main').first()).toBeVisible();
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.locator('a[href="/demo"]')).toBeVisible();
  await expect(page.locator('a[href="/pricing"]')).toBeVisible();
  await expectAccessible(page, '/', { disableRules: ['region'] });
  const navigationTiming = await page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0];
    return entry ? { domContentLoaded: entry.domContentLoadedEventEnd, load: entry.loadEventEnd } : null;
  });
  expect(navigationTiming).not.toBeNull();
  expect(navigationTiming.domContentLoaded).toBeLessThan(3000);
  expect(navigationTiming.load).toBeLessThan(5000);
  await page.screenshot({ path: 'artifacts/landing.png', fullPage: true });
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('public critical routes return successfully, accessible and runtime-clean', async ({ page }) => {
  const { consoleErrors, pageErrors } = await attachRuntimeGuards(page);
  for (const path of ['/demo', '/pricing']) {
    await expectHealthyPage(page, path);
    await expect(page.locator('h1').first()).toBeVisible();
    if (path === '/demo') await expectDemoAccessible(page);
    else await expectAccessible(page, path);
  }
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('public demo is interactive, safe and visually stable', async ({ page }) => {
  const { consoleErrors, pageErrors } = await attachRuntimeGuards(page);
  await expectHealthyPage(page, '/demo');
  await expect(page.locator('h1').filter({ hasText: 'Entra a Nüva One' })).toBeVisible();
  await expect(page.getByText('Demo completa')).toBeVisible();
  await expect(page.getByText('Sin registro · datos ficticios · sin pagos')).toBeVisible();
  await expect(page.getByText('Reiniciar experiencia completa')).toBeVisible();
  await expectDemoAccessible(page);
  const cta = page.getByRole('link', { name: /Crear mi cuenta/i }).first();
  await expect(cta).toHaveAttribute('href', /\/auth/);
  await page.screenshot({ path: 'artifacts/demo.png', fullPage: true });
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('landing experience has the Nüva motion layer and respects reduced motion', async ({ page }) => {
  const { consoleErrors, pageErrors } = await attachRuntimeGuards(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expectHealthyPage(page, '/');
  await expect(page.locator('section#experience')).toBeVisible();
  await expectAccessible(page, '/', { disableRules: ['region'] });
  const motionLayerLoaded = await page.evaluate(() => [...document.styleSheets].some((sheet) => {
    try { return [...sheet.cssRules].some((rule) => rule.cssText.includes('nuva-cinematic-drift')); } catch { return false; }
  }));
  expect(motionLayerLoaded).toBe(true);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await page.screenshot({ path: 'artifacts/experience.png', fullPage: true });
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('landing has no horizontal overflow on desktop and mobile', async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expectHealthyPage(page, '/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
  }
});
