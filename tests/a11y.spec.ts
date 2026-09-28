import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * §14 / Prompt 13: automated axe-core checks on the public routes. Zero
 * violations is the acceptance criterion. The Payload admin login is exempt
 * here — its markup is third-party (no main landmark/h1) and is tracked as a
 * Prompt 13 hardening item in DECISIONS.md, not a public-surface gate.
 */

const ROUTES: Array<{ name: string; path: string }> = [
  { name: 'home', path: '/en' },
  { name: 'collection', path: '/en/collection?tier=trophy&beds=4' },
  { name: 'listing', path: '/en/property/sample-wl-sample-001' },
  { name: 'markets hub', path: '/en/markets' },
  { name: 'journal', path: '/en/journal' },
  { name: 'contact', path: '/en/contact' },
  { name: 'sell', path: '/en/list-with-us' },
];

test.describe('Accessibility', () => {
  for (const route of ROUTES) {
    test(`${route.name} has no automatically detectable a11y violations`, async ({ page }) => {
      await page.goto(route.path);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }


  test('styleguide has no automatically detectable a11y violations', async ({ page }) => {
    await page.goto('/dev/styleguide');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('tabbing into the styleguide shows a visible focus ring', async ({ page }) => {
    await page.goto('/dev/styleguide');
    await page.keyboard.press('Tab');
    const outlineWidth = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return '0px';
      return getComputedStyle(el).outlineWidth;
    });
    expect(outlineWidth).not.toBe('0px');
  });
});
