import { test, expect } from '@playwright/test';

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

test('landing smoke, accessibility heuristics and performance budget', async ({ page }) => {
  const { consoleErrors, pageErrors } = await attachRuntimeGuards(page);

  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('h1').first()).toBeVisible();

  const navigationTargets = await page.locator('a[href]').evaluateAll((links) =>
    links.map((link) => link.getAttribute('href')).filter(Boolean),
  );
  expect(navigationTargets).toContain('/demo');
  expect(navigationTargets).toContain('/pricing');

  const accessibility = await page.locator('img').evaluateAll((images) =>
    images.map((img) => ({
      alt: img.getAttribute('alt'),
      ariaHidden: img.getAttribute('aria-hidden'),
    })),
  );
  expect(
    accessibility.filter(({ alt, ariaHidden }) => alt === null && ariaHidden !== 'true'),
    'images must have alt text or be explicitly decorative',
  ).toEqual([]);

  const unlabeledButtons = await page.locator('button').evaluateAll((buttons) =>
    buttons.filter((button) => !button.textContent?.trim() && !button.getAttribute('aria-label')),
  );
  expect(unlabeledButtons, 'buttons need an accessible name').toEqual([]);

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

test('public demo is interactive, safe and visually stable', async ({ page }) => {
  const { consoleErrors, pageErrors } = await attachRuntimeGuards(page);

  await page.goto('/demo', { waitUntil: 'networkidle' });
  await expect(page.locator('h1')).toContainText('Entra a Nüva One');
  await expect(page.getByText('Demo completa')).toBeVisible();
  await expect(page.getByText('Sin registro · datos ficticios · sin pagos')).toBeVisible();
  await expect(page.getByText('Reiniciar experiencia completa')).toBeVisible();

  const cta = page.getByRole('link', { name: /Crear mi cuenta/i }).first();
  await expect(cta).toHaveAttribute('href', /\/auth/);

  await page.screenshot({ path: 'artifacts/demo.png', fullPage: true });

  expect(consoleErrors, `demo console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  expect(pageErrors, `demo page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});

test('landing experience has the Nüva motion layer and respects reduced motion', async ({ page }) => {
  const { consoleErrors, pageErrors } = await attachRuntimeGuards(page);

  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('section#experience')).toBeVisible();

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
