import { expect, test } from '@playwright/test';

/**
 * Phase 10 (Prompt 15) — brochure PDF route and dashboards.
 * The sandbox has no database, so the brochure route exercises the
 * gated sample fallback path and the dashboard renders its signed-out shell.
 */

const SAMPLE_SLUG = 'sample-lpc-sample-001';

test.describe('brochure PDF route', () => {
  test('returns a PDF for a known listing', async ({ request }) => {
    const response = await request.get(`/api/property/${SAMPLE_SLUG}/brochure.pdf`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
    const body = await response.body();
    expect(body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(body.length).toBeGreaterThan(1000);
  });

  test('localises the brochure', async ({ request }) => {
    const response = await request.get(`/api/property/${SAMPLE_SLUG}/brochure.pdf?locale=de`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
  });

  test('404s for an unknown slug', async ({ request }) => {
    const response = await request.get('/api/property/not-a-real-listing/brochure.pdf');
    expect(response.status()).toBe(404);
  });
});

test.describe('brochure CTA on the listing page', () => {
  test('the detail page links to the PDF', async ({ page }) => {
    await page.goto(`/en/property/${SAMPLE_SLUG}`);
    const cta = page.getByRole('link', { name: /brochure/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute(
      'href',
      `/api/property/${SAMPLE_SLUG}/brochure.pdf?locale=en`,
    );
  });
});

test.describe('dashboard', () => {
  test('signed-out visitors get the sign-in shell, noindexed', async ({ page }) => {
    const response = await page.goto('/en/dashboard');
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open the backoffice' })).toBeVisible();

    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute('content', /noindex/);
  });

  test('dashboard is keyboard reachable', async ({ page }) => {
    await page.goto('/en/dashboard');
    const cta = page.getByRole('link', { name: 'Open the backoffice' });
    await cta.focus();
    await expect(cta).toBeFocused();
  });
});
