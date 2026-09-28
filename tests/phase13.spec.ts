import { expect, test } from '@playwright/test';

/**
 * Phase 13 (Prompt 18) — security, privacy, anti-scraping.
 * Headers + CSP behaviour is asserted here; the "CSP produces no console
 * violations" acceptance is additionally enforced by console-errors.spec.ts
 * running with these headers active.
 */

test.describe('security headers (§16.1)', () => {
  test('public pages carry the full header set', async ({ request }) => {
    const response = await request.get('/en');
    const headers = response.headers();

    const csp = headers['content-security-policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('https://api.maptiler.com');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['strict-transport-security']).toContain('max-age=63072000');
    expect(headers['x-xss-protection']).toBeUndefined();
  });

  test('the API surface carries the same headers', async ({ request }) => {
    const response = await request.get('/api/health');
    const headers = response.headers();
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  test('no CSP violations while browsing home, search and a listing', async ({ page }) => {
    const violations: string[] = [];
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        const e = event as SecurityPolicyViolationEvent;
        (window as unknown as { __cspViolations: string[] }).__cspViolations ??= [];
        (window as unknown as { __cspViolations: string[] }).__cspViolations.push(
          `${e.violatedDirective}: ${e.blockedURI}`,
        );
      });
    });
    for (const path of ['/en', '/en/collection?water=sea', '/en/property/sample-wl-sample-001']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const found = await page.evaluate(
        () => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? [],
      );
      violations.push(...found.map((v) => `${path} → ${v}`));
    }
    expect(violations).toEqual([]);
  });
});

test.describe('privacy endpoints (§16.4/§16.5)', () => {
  test('lead anonymisation rejects anonymous callers', async ({ request }) => {
    const response = await request.post('/api/admin/anonymize-lead', {
      data: { leadId: 1 },
    });
    // 401 with a database; DB-less sandboxes surface the connection failure
    // instead — never a 200.
    expect([401, 429, 500, 503]).toContain(response.status());
    expect(response.status()).not.toBe(200);
    if (process.env.CI) expect(response.status()).toBe(401);
  });

  test('the retention cron rejects requests without the CRON_SECRET', async ({ request }) => {
    const response = await request.get('/api/cron/retention');
    expect(response.status()).toBe(401);
  });

  test('feed ingestion rejects a missing token', async ({ request }) => {
    const response = await request.post('/api/feeds/some-agency', { data: {} });
    expect([401, 503]).toContain(response.status());
    expect(response.status()).not.toBe(200);
  });
});

test.describe('legal pages (§16.3/§16.4)', () => {
  test('privacy, cookies and terms render', async ({ page }) => {
    for (const doc of ['privacy', 'cookies', 'terms']) {
      const response = await page.goto(`/en/legal/${doc}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('the terms state the scraping prohibition', async ({ page }) => {
    await page.goto('/en/legal/terms');
    await expect(page.getByText(/scraping/i).first()).toBeVisible();
    await expect(page.getByText(/prohibited/i).first()).toBeVisible();
  });

  test('unknown legal documents 404', async ({ page }) => {
    const response = await page.goto('/en/legal/imprint');
    expect(response?.status()).toBe(404);
  });

  test('the footer links resolve to the legal pages', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('a[href="/en/legal/privacy"]')).toBeVisible();
    await expect(page.locator('a[href="/en/legal/terms"]')).toBeVisible();
  });
});
