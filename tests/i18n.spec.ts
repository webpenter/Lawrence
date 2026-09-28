import { test, expect } from '@playwright/test';

// Prompt 6 acceptance criteria, live in a browser.

test('"/" performs an uncached 302 language-detect redirect', async ({ request }) => {
  const response = await request.get('/', {
    maxRedirects: 0,
    headers: { 'accept-language': 'it-IT,it;q=0.9' },
  });
  expect(response.status()).toBe(302);
  expect(response.headers()['location']).toContain('/it');
  expect(response.headers()['cache-control']).toContain('no-store');
});

test('"/" falls back to /en for unsupported languages', async ({ request }) => {
  const response = await request.get('/', {
    maxRedirects: 0,
    headers: { 'accept-language': 'ja-JP,ja;q=0.9' },
  });
  expect(response.status()).toBe(302);
  expect(response.headers()['location']).toContain('/en');
});

test('every page emits hreflang for all locales plus x-default', async ({ page }) => {
  await page.goto('/en');
  for (const locale of ['en', 'it', 'fr', 'de', 'es', 'ru']) {
    await expect(page.locator(`link[rel="alternate"][hreflang="${locale}"]`)).toHaveCount(1);
  }
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
});

test('locale switcher preserves path and query', async ({ page }) => {
  await page.goto('/en?tier=trophy');
  await page.getByLabel('Language').selectOption('it');
  await page.waitForURL('**/it?tier=trophy');
  expect(new URL(page.url()).pathname).toBe('/it');
  expect(new URL(page.url()).search).toBe('?tier=trophy');
});

test('a locale page renders the copy-deck hero and sets the html lang', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Exceptional property, openly and otherwise.',
  );
  await page.goto('/it');
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
});

test('unknown locale segments end in a 404', async ({ request }) => {
  // next-intl treats /xx as an unprefixed path and 307s it to /<detected>/xx,
  // which has no route — following redirects must land on a 404.
  const response = await request.get('/xx');
  expect(response.status()).toBe(404);
});
