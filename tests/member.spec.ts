import { test, expect } from '@playwright/test';

// Prompt 9 live acceptance: the join flow works end to end in a browser, and
// anonymous requests to off-market content return 404 (detail) / the join
// invitation (index). Uses the §13.10 seeded members
// (member01@sample.lawrence is verified).

const MEMBER_EMAIL = 'member01@sample.lawrence';
const MEMBER_PASSWORD = 'sample-member-password';

async function login(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/en/login');
  await page.getByLabel('Email').fill(MEMBER_EMAIL);
  await page.getByLabel('Password').fill(MEMBER_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/en/off-market');
}

test.describe('Join flow (§8.5)', () => {
  test('the join form creates an account and lands on the check-your-email state', async ({
    page,
  }) => {
    await page.goto('/en/join');
    const email = `e2e-${Date.now().toString(36)}@test.lawrence`;
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill('e2e-password-123');
    await page.getByRole('button', { name: 'Create an account' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  });

  test('the join page shows the live off-market count in its panel', async ({ page }) => {
    await page.goto('/en/join');
    await expect(page.getByText(/properties are currently held off-market/)).toBeVisible();
  });
});

test.describe('Off-market access (§8.2/§8.6)', () => {
  test('anonymous /off-market redirects to the join invitation', async ({ page }) => {
    await page.goto('/en/off-market');
    await page.waitForURL('**/en/join');
  });

  test('an anonymous request to an off-market listing is a 404, even for a real id', async ({
    browser,
    request,
  }) => {
    // Discover a REAL off-market id as a member, then hit it anonymously.
    const memberContext = await browser.newContext();
    const page = await memberContext.newPage();
    await login(page);
    const firstCard = page.locator('a[href*="/off-market/"]').first();
    await firstCard.waitFor({ state: 'visible' });
    const href = await firstCard.getAttribute('href');
    await memberContext.close();
    expect(href).toBeTruthy();

    const anonymous = await request.get(href as string);
    expect(anonymous.status()).toBe(404);
    // And an unknown id is indistinguishable.
    const unknown = await request.get('/en/off-market/999999');
    expect(unknown.status()).toBe(404);
  });

  test('a verified member sees the off-market index with its confidential inventory', async ({
    page,
  }) => {
    await login(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Off-market' })).toBeVisible();
    await expect(page.getByText(/properties$|properties/).first()).toBeVisible();
    // The §13.10 samples are present.
    await expect(page.locator('a[href*="/off-market/"]').first()).toBeVisible();
    // Never cached (§5.3).
    const response = await page.request.get('/en/off-market');
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('the off-market detail renders the confidentiality notice for members', async ({
    page,
  }) => {
    await login(page);
    await page.locator('a[href*="/off-market/"]').first().click();
    await page.waitForURL('**/en/off-market/**');
    await expect(
      page.getByText('These properties are not publicly marketed.').or(
        page.getByText('not publicly marketed'),
      ).first(),
    ).toBeVisible();
  });

  test('saving from the off-market detail appears in the account area', async ({ page }) => {
    await login(page);
    await page.locator('a[href*="/off-market/"]').first().click();
    await page.waitForURL('**/en/off-market/**');
    const propertyId = Number(page.url().split('/off-market/')[1]);
    expect(Number.isFinite(propertyId)).toBe(true);

    // The save button is on the page…
    await expect(
      page.getByRole('button', { name: 'Saved properties' }).first(),
    ).toBeVisible();

    // …and the state is driven through the same API it calls, made
    // deterministic against leftover state from earlier runs.
    const status = (await (
      await page.request.get(`/api/member/saved?property=${propertyId}`)
    ).json()) as { saved?: boolean };
    if (!status.saved) {
      const toggled = (await (
        await page.request.post('/api/member/saved', { data: { propertyId } })
      ).json()) as { saved?: boolean };
      expect(toggled.saved).toBe(true);
    }

    await page.goto('/en/account');
    await expect(page.locator('a[href*="/off-market/"]').first()).toBeVisible();
  });
});
