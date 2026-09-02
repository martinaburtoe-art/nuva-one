import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
test.use({ baseURL });

async function attachRuntimeGuards(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => pageErrors.push(e.message));
  return { consoleErrors, pageErrors };
}

async function dismissWelcomeOverlay(page) {
  const skip = page.getByRole('button', { name: 'Omitir' });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await expect(skip).toBeHidden({ timeout: 5000 });
  }
}

async function expectHealthyPage(page, path) {
  const response = await page.goto(path, { waitUntil: 'networkidle' });
  expect(response, `${path} must return a response`).not.toBeNull();
  expect(response.ok(), `${path} returned HTTP ${response.status()}`).toBe(true);
  await dismissWelcomeOverlay(page);
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
  await expect(page.locator('a[href="/demo"]').first()).toBeVisible();
  await expect(page.locator('a[href="/pricing"]').first()).toBeVisible();
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
  const motionLayerLoaded = await page.evaluate(() =>
    [...document.styleSheets].some((sheet) => {
      try {
        return [...sheet.cssRules].some((rule) => rule.cssText.includes('nuva-cinematic-drift'));
      } catch {
        return false;
      }
    }),
  );
  expect(motionLayerLoaded).toBe(true);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await page.screenshot({ path: 'artifacts/experience.png', fullPage: true });
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('landing has no horizontal overflow on desktop and mobile', async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expectHealthyPage(page, '/');

    const diagnostics = await page.evaluate(() => {
      const vw = innerWidth;
      const isOverflowBoundary = (el) => {
        for (let node = el.parentElement; node; node = node.parentElement) {
          const overflowX = getComputedStyle(node).overflowX;
          if (['hidden', 'clip', 'auto', 'scroll'].includes(overflowX)) return true;
        }
        return false;
      };

      const nodes = [...document.querySelectorAll('*')]
        .map((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return {
            tag: el.tagName,
            id: el.id,
            cls: typeof el.className === 'string' ? el.className.slice(0, 160) : '',
            left: Math.round(r.left),
            right: Math.round(r.right),
            width: Math.round(r.width),
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            position: s.position,
            display: s.display,
            overflowX: s.overflowX,
            contained: isOverflowBoundary(el),
          };
        })
        .filter(
          (x) =>
            x.display !== 'none' &&
            !x.contained &&
            (x.right > vw + 1 || x.left < -1),
        )
        .sort((a, b) => Math.max(b.right - vw, -b.left) - Math.max(a.right - vw, -a.left))
        .slice(0, 40);

      return {
        vw,
        documentScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        nodes,
      };
    });

    // documentElement.scrollWidth can include an intentionally scrollable child rail even when
    // the page itself is not horizontally scrollable. bodyScrollWidth plus uncontained bounds
    // are therefore the page-level invariants we enforce here.
    const pageOverflow = diagnostics.bodyScrollWidth - viewport.width;
    if (pageOverflow > 1 || diagnostics.nodes.length > 0) {
      throw new Error(
        `horizontal page overflow at ${viewport.width}px: ${JSON.stringify(diagnostics)}`,
      );
    }
    expect(pageOverflow).toBeLessThanOrEqual(1);
    expect(diagnostics.nodes).toEqual([]);
  }
});
