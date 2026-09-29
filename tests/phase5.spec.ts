import { test, expect } from '@playwright/test';

// Phase 5 live acceptance (§5.5): the engine's gates and canonicalisation,
// verifiable without inventory.

test('the markets hub renders with h1 and hreflang', async ({ page }) => {
  await page.goto('/en/markets');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Markets');
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
});

test('a segment outside the controlled taxonomy 404s (§5.5 gate)', async ({ request }) => {
  const response = await request.get('/en/markets/lake-como/castles');
  expect(response.status()).toBe(404);
});

test('an unseeded market × segment combination 404s (§5.5 — never auto-published)', async ({
  request,
}) => {
  // 'golf-estates' is in the taxonomy but has no published page for Como.
  const response = await request.get('/en/markets/lake-como/golf-estates');
  expect(response.status()).toBe(404);
});

test('segment aliases 301 to the canonical slug before gating', async ({ request }) => {
  const response = await request.get('/en/markets/lake-como/waterfront', {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(308);
  expect(response.headers()['location']).toContain('/en/markets/lake-como/waterfront-estates');
});

test('unknown market slugs 404', async ({ request }) => {
  const response = await request.get('/en/markets/atlantis');
  expect(response.status()).toBe(404);
});
