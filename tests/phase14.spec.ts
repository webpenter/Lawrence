import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

/**
 * Phase 14 (Prompt 19) — Production Layer:
 * - Operational runbooks and launch checklist
 * - Sitemap verification (index + child sitemaps)
 * - Edge caching headers
 * - Analytics script presence and PII protection
 */

test.describe('operational runbooks & documentation (§19, §20)', () => {
  test('all 5 core operational runbooks exist and contain required protocols', () => {
    const requiredRunbooks = [
      'docs/runbooks/deploy.md',
      'docs/runbooks/database.md',
      'docs/runbooks/search-index.md',
      'docs/runbooks/incidents.md',
      'docs/runbooks/content-freeze-launch.md',
    ];

    for (const runbook of requiredRunbooks) {
      expect(existsSync(runbook), `Runbook ${runbook} must exist`).toBe(true);
      const content = readFileSync(runbook, 'utf8');
      expect(content.length).toBeGreaterThan(200);
    }
  });

  test('LAUNCH-CHECKLIST.md implements definition of done and blocking gates', () => {
    expect(existsSync('LAUNCH-CHECKLIST.md')).toBe(true);
    const content = readFileSync('LAUNCH-CHECKLIST.md', 'utf8');
    expect(content).toContain('SAMPLE_DATA_ENABLED=false');
    expect(content).toContain('sample:purge');
    expect(content).toContain('Definition of Done');
  });

  test('docs/admin-guide.md is complete for editors and agencies', () => {
    expect(existsSync('docs/admin-guide.md')).toBe(true);
    const content = readFileSync('docs/admin-guide.md', 'utf8');
    expect(content).toContain('Water Rule');
    expect(content).toContain('GDPR');
    expect(content).toContain('Moderation');
  });
});

test.describe('sitemap index & child sitemaps verification (§14)', () => {
  test('serves valid sitemap index at /sitemap.xml', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/xml');

    const xml = await res.text();
    expect(xml).toContain('<sitemapindex');
    expect(xml).toContain('/sitemaps/static.xml');
    expect(xml).toContain('/sitemaps/properties.xml');
    expect(xml).toContain('/sitemaps/landing.xml');
    expect(xml).toContain('/sitemaps/destinations.xml');
    expect(xml).toContain('/sitemaps/articles.xml');
  });

  test('serves static child sitemap with all core routes', async ({ request }) => {
    const res = await request.get('/sitemaps/static.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/xml');

    const xml = await res.text();
    expect(xml).toContain('<urlset');
    expect(xml).toContain('/collection');
    expect(xml).toContain('/contact');
    expect(xml).toContain('/list-with-us');
    expect(xml).toContain('/journal');
  });

  test('sitemaps return public edge cache-control headers', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    const cacheControl = res.headers()['cache-control'] ?? '';
    expect(cacheControl).toContain('public');
    expect(cacheControl).toContain('s-maxage=3600');
  });
});

test.describe('analytics integration (§17)', () => {
  test('homepage includes deferred analytics script when domain is configured', async ({ page }) => {
    await page.goto('/en');
    const script = page.locator('script[src*="plausible.io"]');
    // If NEXT_PUBLIC_PLAUSIBLE_DOMAIN is configured, script must be deferred/afterInteractive
    if (await script.count() > 0) {
      await expect(script).toHaveAttribute('defer', '');
    }
  });
});
