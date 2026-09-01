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
  await expect(page.locator('body')).toBeVisible();
}

async function expectAccessible(page, path) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, `${path} has accessibility violations`).toEqual([]);
}

test('landing smoke, accessibility and performance budget', async ({ page }) => {
  const { consoleErrors, pageErrors } = await attachRuntimeGuards(page);

  const response = await page.goto('/', { waitUntil: 'networkidle' });
  expect(response).not.toBeNull();
  expect(response.ok(), `landing returned HTTP ${response.status()}`).toBe(true);
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('h1').first()).toBeVisible();

  const navigationTargets = await page.locator('a[href]').evaluateAll((links) =>
    links.map((link) => link.getAttribute('href')).filter(Boolean),
  );
  expect(navigationTargets).toContain('/demo');
  expect(navigationTargets).toContain('/pricing');

  await expectAccessible(page, '/');

  const navigationTiming = await page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0];
    if (!entry) return null;
    return { domContentLoaded: entry.domContentLoadedEventEnd, load: entry.loadEventEnd };
  });
  expect(navigationTiming).not.toBeNull();
  expect(navigationTiming.domContentLoaded).toBeLessThan(3000);
  expect(navigationTiming.load).toBeLessThan(5000);

  await page.screenshot({ path: 'artifacts/landing.png', fullPage: true });

  expect(consoleErrors, `browser console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});

test('public critical routes return successfully, accessible and runtime-clean', async ({ page }) => {
  const { consoleErrors, pageErrors } = await attachRuntimeGuards(page);

  for (const path of ['/demo', '/pricing']) {
    await expectHealthyPage(page, path);
    await expect(page.locator('h1').first()).toBeVisible();
    await expectAccessible(page, path);
  }

  expect(consoleErrors, `critical-route console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  expect(pageErrors, `critical-route page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});

test('public demo is interactive, safe and visually stable', async ({ page }) => {
  const { consoleErrors, pageErrors } = await attachRuntimeGuards(page);

  await expectHealthyPage(page, '/demo');
  await expect(page.locator('h1')).toContainText('Entra a Nüva One');
  await expect(page.getByText('Demo completa')).toBeVisible();
  await expect(page.getByText('Sin registro · datos ficticios · sin pagos')).toBeVisible();
  await expect(page.getByText('Reiniciar experiencia completa')).toBeVisible();
  await expectAccessible(page, '/demo');

  const cta = page.getByRole('link', { name: /Crear mi cuenta/i }).first();
  await expect(cta).toHaveAttribute('href', /\/auth/);

  await page.screenshot({ path: 'artifacts/demo.png', fullPage: true });

  expect(consoleErrors, `demo console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  expect(pageErrors, `demo page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});

test('landing experience has the Nüva motion layer and respects reduced motion', async ({ page }) => {
  const { consoleErrors, pageErrors } = await attachRuntimeGuards(page);

  await expectHealthyPage(page, '/');
  await expect(page.locator('section#experience')).toBeVisible();
  await expectAccessible(page, '/');

  const motionLayerLoaded = await page.evaluate(() => {
    const styles = [...document.styleSheets];
    return styles.some((sheet) => {
      try {
        return [...sheet.cssRules].some((rule) => rule.cssText.includes('nuva-cinematic-drift'));
      } catch {
        return false;
      }
    });
  });
  expect(motionLayerLoaded, 'Nüva motion layer must be loaded on landing').toBe(true);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedMotion = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  expect(reducedMotion).toBe(true);

  await page.screenshot({ path: 'artifacts/experience.png', fullPage: true });

  expect(consoleErrors, `experience console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  expect(pageErrors, `experience page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});
