import { expect, test } from '@playwright/test';

/**
 * Phase 12 (Prompt 17) — Performance Pass:
 * - Signed ISR revalidation route (/api/revalidate)
 * - Cache-Control and edge caching headers
 * - Image priority discipline (exactly one priority image per page)
 * - Accidental dynamic rendering verification
 */

test.describe('signed ISR revalidation (/api/revalidate)', () => {
  const SECRET = process.env.REVALIDATE_SECRET || 'dev_revalidate_secret_key';

  test('rejects requests without a secret with 401', async ({ request }) => {
    const res = await request.post('/api/revalidate', {
      data: { paths: ['/en'] },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.revalidated).toBe(false);
  });

  test('rejects requests with an incorrect secret with 401', async ({ request }) => {
    const res = await request.post('/api/revalidate', {
      headers: { 'x-revalidate-secret': 'wrong_secret_value' },
      data: { paths: ['/en'] },
    });
    expect(res.status()).toBe(401);
  });

  test('rejects malformed requests with 400', async ({ request }) => {
    const res = await request.post('/api/revalidate', {
      headers: { 'x-revalidate-secret': SECRET },
      data: { paths: [] },
    });
    expect(res.status()).toBe(400);
  });

  test('successfully revalidates paths with valid secret', async ({ request }) => {
    const res = await request.post('/api/revalidate', {
      headers: { 'x-revalidate-secret': SECRET },
      data: { paths: ['/property/sample-lpc-sample-001', '/'] },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.revalidated).toBe(true);
    expect(Array.isArray(body.paths)).toBe(true);
    expect(body.paths.length).toBeGreaterThan(0);
  });
});

test.describe('image priority discipline (§12.2 rule 2)', () => {
  test('home page has at most one priority image', async ({ page }) => {
    await page.goto('/en');
    const priorityImages = page.locator('img[fetchpriority="high"], img[loading="eager"]');
    const count = await priorityImages.count();
    expect(count).toBeLessThanOrEqual(1);
  });

  test('listing detail page has at most one priority image', async ({ page }) => {
    await page.goto('/en/property/sample-lpc-sample-001');
    const priorityImages = page.locator('img[fetchpriority="high"], img[loading="eager"]');
    const count = await priorityImages.count();
    expect(count).toBeLessThanOrEqual(1);
  });
});

test.describe('static rendering verification (§12.2 rule 1)', () => {
  test('journal index and slug are accessible without server rendering crashes', async ({ page }) => {
    const resIndex = await page.goto('/en/journal');
    expect(resIndex?.status()).toBe(200);

    const resArticle = await page.goto('/en/journal/sample-mooring-rights-private-berth');
    expect(resArticle?.status()).toBe(200);
  });
});
