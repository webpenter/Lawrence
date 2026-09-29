import { test, expect } from '@playwright/test';

// Phase 7 live acceptance (Prompt 12): consent banner behaviour, lead pages,
// rate limiting. Email dispatch is verified in staging with a real Resend key.

test.describe('Cookie consent (§4 decision 7)', () => {
  test('banner is deferred, fixed-position, and causes zero layout shift', async ({ page }) => {
    await page.goto('/en');
    const h1 = page.getByRole('heading', { level: 1 });
    const before = await h1.boundingBox();
    // Banner must not be present immediately (deferred — never competes with LCP).
    expect(await page.getByRole('region', { name: 'Cookies at Lawrence' }).count()).toBe(0);

    const banner = page.getByRole('region', { name: 'Cookies at Lawrence' });
    await banner.waitFor({ state: 'visible', timeout: 8000 });
    await expect(banner).toHaveCSS('position', 'fixed');
    const after = await h1.boundingBox();
    expect(after?.y).toBe(before?.y);
  });

  test('accepting stores the decision and the banner never returns', async ({ page }) => {
    await page.goto('/en');
    const banner = page.getByRole('region', { name: 'Cookies at Lawrence' });
    await banner.waitFor({ state: 'visible', timeout: 8000 });
    await page.getByRole('button', { name: 'Accept all' }).click();
    await expect(banner).toHaveCount(0);

    const cookies = await page.context().cookies();
    const consent = cookies.find((c) => c.name === 'lpc_consent');
    expect(consent).toBeTruthy();
    expect(decodeURIComponent(consent?.value ?? '')).toContain('"analytics":true');

    await page.reload();
    await page.waitForTimeout(3500);
    expect(await page.getByRole('region', { name: 'Cookies at Lawrence' }).count()).toBe(0);
  });

  test('customise saves a granular decision', async ({ page }) => {
    await page.goto('/en');
    const banner = page.getByRole('region', { name: 'Cookies at Lawrence' });
    await banner.waitFor({ state: 'visible', timeout: 8000 });
    await page.getByRole('button', { name: 'Customise' }).click();
    await page.getByLabel(/Analytics/).check();
    await page.getByRole('button', { name: 'Save choices' }).click();
    const cookies = await page.context().cookies();
    const value = decodeURIComponent(
      cookies.find((c) => c.name === 'lpc_consent')?.value ?? '',
    );
    expect(value).toContain('"analytics":true');
    expect(value).toContain('"marketing":false');
  });
});

test.describe('Lead pages', () => {
  test('contact page renders the shared form with consent gate', async ({ page }) => {
    await page.goto('/en/contact');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contact the desk');
    await expect(page.getByLabel('Your name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request details' })).toBeVisible();
  });

  test('list-with-us page carries the supply copy and the form', async ({ page }) => {
    await page.goto('/en/list-with-us');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sell a property');
    await expect(page.getByText('prefer the market not', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request details' })).toBeVisible();
  });

  test('submitting without consent shows the consent message and sends nothing', async ({
    page,
  }) => {
    await page.goto('/en/contact');
    await page.getByLabel('Your name').fill('Test Person');
    await page.getByLabel('Email').fill('test@example.com');
    let posted = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/enquiry')) posted = true;
    });
    await page.getByRole('button', { name: 'Request details' }).click();
    await expect(
      page.getByText('Please accept the consent statement', { exact: false }).first(),
    ).toBeVisible();
    expect(posted).toBe(false);
  });
});

test.describe('Rate limiting (5/IP/hour)', () => {
  test('the sixth POST in an hour is rejected with 429', async ({ request }) => {
    const payload = {
      name: 'Rate Limit Probe',
      email: 'probe@example.com',
      source: 'contact',
      consent: true,
      startedAt: Date.now() - 10_000,
    };
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const response = await request.post('/api/enquiry', {
        data: payload,
        headers: { 'x-forwarded-for': '203.0.113.77' },
      });
      statuses.push(response.status());
    }
    expect(statuses[5]).toBe(429);
    expect(statuses.slice(0, 5).every((s) => s !== 429)).toBe(true);
  });
});
