import { test, expect } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173';

test.use({ baseURL });

test('landing smoke, accessibility heuristics and performance budget', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

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
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt'),
      ariaHidden: img.getAttribute('aria-hidden'),
    })),
  );
  const unlabeledImages = accessibility.filter(
    ({ alt, ariaHidden }) => alt === null && ariaHidden !== 'true',
  );
  expect(unlabeledImages, 'images must have alt text or be explicitly decorative').toEqual([]);

  const interactive = await page.locator('a,button,input,select,textarea').evaluateAll((nodes) =>
    nodes.map((node) => ({
      tag: node.tagName,
      text: node.textContent?.trim() ?? '',
      ariaLabel: node.getAttribute('aria-label'),
      type: node.getAttribute('type'),
    })),
  );
  const unlabeledButtons = interactive.filter(
    ({ tag, text, ariaLabel, type }) =>
      tag === 'BUTTON' && !text && !ariaLabel && type !== 'submit',
  );
  expect(unlabeledButtons, 'buttons need an accessible name').toEqual([]);

  const navigationTiming = await page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0];
    if (!entry) return null;
    return {
      domContentLoaded: entry.domContentLoadedEventEnd,
      load: entry.loadEventEnd,
    };
  });
  expect(navigationTiming).not.toBeNull();
  expect(navigationTiming.domContentLoaded).toBeLessThan(3000);
  expect(navigationTiming.load).toBeLessThan(5000);

  await page.screenshot({ path: 'artifacts/landing.png', fullPage: true });

  expect(consoleErrors, `browser console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});
