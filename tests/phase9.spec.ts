import { test, expect } from '@playwright/test';

// Machine-endpoint live acceptance (Prompt 10/§15.6): sitemaps, llms, OG images.

test('robots.txt serves the §15.6 AI-crawler policy as text/plain', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/plain');
  const body = await response.text();
  for (const bot of ['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended']) {
    expect(body).toContain(`User-agent: ${bot}`);
  }
  expect(body).toContain('Disallow: /admin');
  // §15.3: /off-market and /account are robots-excluded on every locale prefix.
  expect(body).toContain('Disallow: /*/off-market');
  expect(body).toContain('Disallow: /*/account');
  expect(body).toContain('Sitemap:');
});

test('llms.txt and llms-full.txt are served as text/plain with the admission rule', async ({
  request,
}) => {
  const expectations: Array<[string, string]> = [
    ['/llms.txt', 'admitted from \u20ac20,000,000'],
    ['/llms-full.txt', 'source and asOfDate'],
  ];
  for (const [path, admissionRule] of expectations) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).toContain('text/plain');
    expect(await response.text(), path).toContain(admissionRule);
  }
});

test('sitemap index and every typed child return valid XML', async ({ request }) => {
  const index = await request.get('/sitemap.xml');
  expect(index.status()).toBe(200);
  expect(index.headers()['content-type']).toContain('xml');
  const body = await index.text();
  for (const child of ['static', 'properties', 'markets', 'segments', 'reports', 'journal']) {
    expect(body).toContain(`/sitemaps/${child}.xml`);
    const childResponse = await request.get(`/sitemaps/${child}.xml`);
    expect(childResponse.status(), child).toBe(200);
    expect(await childResponse.text()).toContain('<urlset');
  }
});

test('unknown sitemap children 404', async ({ request }) => {
  const response = await request.get('/sitemaps/nonsense.xml');
  expect(response.status()).toBe(404);
});

test('dynamic OG routes return share-card images even without data', async ({ request }) => {
  for (const path of ['/api/og/property/does-not-exist', '/api/og/market/does-not-exist']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).toContain('image/');
  }
});

test('the public market stats endpoint 404s unknown markets', async ({ request }) => {
  const response = await request.get('/api/public/markets/not-a-market/stats');
  expect([404, 503]).toContain(response.status());
});

test('sitemaps never contain a gated URL (§15.3)', async ({ request }) => {
  for (const child of ['static', 'properties', 'markets', 'segments', 'reports', 'journal']) {
    const xml = await (await request.get(`/sitemaps/${child}.xml`)).text();
    expect(xml, child).not.toContain('/off-market');
    expect(xml, child).not.toContain('/account');
  }
});

test('pages carry OG/Twitter cards from the metadata helper', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    'content',
    'Lawrence Private Collection',
  );
  await expect(page.locator('meta[name="twitter:card"]').first()).toHaveCount(1);
});

test('Organization and WebSite JSON-LD render on every page', async ({ page }) => {
  await page.goto('/en');
  const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(jsonLd).toContain('"Organization"');
  expect(jsonLd).toContain('"SearchAction"');
});
