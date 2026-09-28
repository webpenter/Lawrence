import { test, expect, type Page } from '@playwright/test';

// CLAUDE.md definition of done: "No console errors or hydration warnings."
// Runs in a clean Chromium (no extensions) — if these pass but a developer
// still sees hydration noise locally, the mismatch is injected by a browser
// extension, not by our HTML.

const ROUTES = ['/en', '/it', '/en/collection', '/dev/styleguide'];

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      const text = msg.text();
      if (
        text.includes('hydrat') ||
        text.includes('did not match') ||
        text.includes('Warning:') ||
        msg.type() === 'error'
      ) {
        errors.push(`[${msg.type()}] ${text}`);
      }
    }
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
  return errors;
}

for (const route of ROUTES) {
  test(`no console errors or hydration warnings on ${route}`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(route, { waitUntil: 'networkidle' });
    // Give React a beat to finish hydration and surface any mismatch.
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
}
