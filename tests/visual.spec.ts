import { expect, test } from '@playwright/test';

/**
 * §18 visual-regression baselines on 10 viewports (Prompt 19).
 *
 * Gated behind VISUAL=1: screenshot baselines are environment-specific
 * (fonts, GPU rasterisation), so they are generated and compared ONLY in CI
 * (`VISUAL=1 pnpm exec playwright test tests/visual.spec.ts --update-snapshots`
 * on the baseline run; plain VISUAL=1 afterwards). See docs/runbooks/deploy.md.
 */

const VIEWPORTS: Array<{ name: string; width: number; height: number }> = [
  { name: 'mobile-320', width: 320, height: 568 },
  { name: 'mobile-375', width: 375, height: 667 },
  { name: 'mobile-414', width: 414, height: 896 },
  { name: 'tablet-portrait-768', width: 768, height: 1024 },
  { name: 'tablet-landscape-1024', width: 1024, height: 768 },
  { name: 'laptop-1280', width: 1280, height: 800 },
  { name: 'laptop-1440', width: 1440, height: 900 },
  { name: 'desktop-1680', width: 1680, height: 1050 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'ultrawide-2560', width: 2560, height: 1440 },
];

const PAGES: Array<{ name: string; path: string }> = [
  { name: 'home', path: '/en' },
  { name: 'search', path: '/en/collection?water=sea' },
  { name: 'listing', path: '/en/property/sample-lpc-sample-001' },
];

test.describe('visual regression (§18)', () => {
  test.skip(process.env.VISUAL !== '1', 'Baseline comparison runs in CI only (VISUAL=1)');

  for (const viewport of VIEWPORTS) {
    for (const pageDef of PAGES) {
      test(`${pageDef.name} @ ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(pageDef.path);
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot(`${pageDef.name}-${viewport.name}.png`, {
          fullPage: true,
          // Animations are already collapsed by prefers-reduced-motion support.
          animations: 'disabled',
          maxDiffPixelRatio: 0.01,
        });
      });
    }
  }
});
