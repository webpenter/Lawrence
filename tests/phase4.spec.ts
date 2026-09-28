import { test, expect } from '@playwright/test';

// Phase 8 live acceptance: home (§11.1), collection browse (§11.2),
// listing detail (§11.3).

test.describe('Home (§11.1)', () => {
  test('hero carries the §12.1 copy deck, two quiet actions and NO search bar', async ({
    page,
  }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Exceptional property, openly and otherwise.',
    );
    await expect(page.getByRole('link', { name: 'View the collection' }).first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'See the off-market properties' }),
    ).toBeVisible();
    // §11.1: no search bar on the homepage — not a search product at first contact.
    expect(await page.locator('form input, form select').count()).toBe(0);
  });

  test('the off-market panel shows the live count and one action (§11.1 block 3)', async ({
    page,
  }) => {
    await page.goto('/en');
    await expect(page.getByText('Held off-market')).toBeVisible();
    await expect(page.getByText(/properties are not publicly listed/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create an account' })).toBeVisible();
  });

  test('how-it-works renders exactly three lines (§12.1)', async ({ page }) => {
    await page.goto('/en');
    const section = page.locator('section', { hasText: 'How it works' });
    await expect(section.locator('li')).toHaveCount(3);
    await expect(section).toContainText('Browse openly');
    await expect(section).toContainText('Speak to the desk');
  });
});

test.describe('Collection browse (§11.2)', () => {
  test('renders the aria-live result count and sort control', async ({ page }) => {
    await page.goto('/en/collection');
    await expect(page.locator('[aria-live="polite"]').first()).toContainText('properties');
    await expect(page.getByRole('combobox').first()).toBeVisible();
  });

  test('active filters appear as removable pills', async ({ page }) => {
    await page.goto('/en/collection?tier=trophy&minFrontage=25');
    await expect(page.getByRole('link', { name: /Frontage ≥ 25 m/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clear all filters' }).first()).toBeVisible();
  });

  test('removing a pill drops exactly that filter from the URL', async ({ page }) => {
    await page.goto('/en/collection?tier=trophy&beds=6');
    await page.getByRole('link', { name: /6\+ bed/ }).click();
    await page.waitForURL('**/en/collection?tier=trophy');
    expect(new URL(page.url()).searchParams.get('beds')).toBeNull();
    expect(new URL(page.url()).searchParams.get('tier')).toBe('trophy');
  });

  test('sort selection writes the sort param and survives back/forward', async ({ page }) => {
    await page.goto('/en/collection?tier=trophy');
    await page.getByRole('combobox').first().selectOption('price_desc');
    await page.waitForURL('**sort=price_desc**');
    await page.goBack();
    await page.waitForURL((url) => !url.searchParams.has('sort'));
    expect(new URL(page.url()).searchParams.get('tier')).toBe('trophy');
  });

  test('filtered collection pages are noindex,follow (§15.3)', async ({ page }) => {
    await page.goto('/en/collection?tier=trophy');
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute('content', /noindex/);
    await expect(robots).toHaveAttribute('content', /follow/);
  });

  test('/search 301s permanently to /collection', async ({ request }) => {
    const response = await request.get('/en/search', { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers()['location']).toContain('/en/collection');
  });
});

test.describe('Listing detail (§11.3)', () => {
  test('unknown slugs 404', async ({ request }) => {
    const response = await request.get('/en/property/does-not-exist');
    expect(response.status()).toBe(404);
  });
});
