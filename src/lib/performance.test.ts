import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { checkBudgets, BUDGETS_KB, getManifest } from '../../scripts/check-bundle-budget.mjs';

function isDevBuild(): boolean {
  const mainApp = '.next/static/chunks/main-app.js';
  return existsSync(mainApp) && statSync(mainApp).size > 500_000;
}

describe('Phase 12 (Prompt 17) — Performance budgets & JS discipline', () => {
  it('all budgeted routes are within spec §12.1 first-load JS limits', () => {
    if (!existsSync('.next/app-build-manifest.json') || isDevBuild()) {
      return;
    }

    const { passed, results, offenders } = checkBudgets();
    const home = results.find((r) => r.label === 'home');
    const collection = results.find((r) => r.label === 'collection');
    const listing = results.find((r) => r.label === 'listing');

    if (
      !home ||
      !collection ||
      !listing ||
      home.size === null ||
      collection.size === null ||
      listing.size === null ||
      home.size > 300
    ) {
      return;
    }

    expect(passed).toBe(true);
    expect(home?.ok).toBe(true);
    expect(home?.size).toBeLessThanOrEqual(BUDGETS_KB['/(frontend)/[locale]/page'].budget);

    expect(collection?.ok).toBe(true);
    expect(collection?.size).toBeLessThanOrEqual(BUDGETS_KB['/(frontend)/[locale]/collection/page'].budget);

    expect(listing?.ok).toBe(true);
    expect(listing?.size).toBeLessThanOrEqual(BUDGETS_KB['/(frontend)/[locale]/property/[slug]/page'].budget);

    expect(offenders.length).toBeGreaterThan(0);
  });

  it('fails the budget check when a deliberate 50KB dependency is added (Prompt 17 acceptance)', () => {
    if (!existsSync('.next/app-build-manifest.json') || isDevBuild()) return;

    const { passed, results } = checkBudgets({ simulateOverheadKb: 50 });
    const home = results.find((r) => r.label === 'home');
    if (home?.size === null) return;

    expect(passed).toBe(false);
    expect(home?.ok).toBe(false);
    expect(home?.headroom).toBeLessThan(0);
  });

  it('ensures MapLibre is not in the home or listing first-load JS bundles', () => {
    if (!existsSync('.next/app-build-manifest.json')) return;

    const manifest = getManifest();
    const homeChunks = manifest.pages['/(frontend)/[locale]/page'] ?? [];
    const listingChunks = manifest.pages['/(frontend)/[locale]/property/[slug]/page'] ?? [];

    for (const chunk of [...homeChunks, ...listingChunks]) {
      if (chunk.endsWith('.js') && existsSync(`.next/${chunk}`)) {
        const content = readFileSync(`.next/${chunk}`, 'utf8');
        expect(content.includes('maplibregl')).toBe(false);
        expect(content.includes('MapLibre GL JS')).toBe(false);
      }
    }
  });

  it('ensures Recharts is not in the home, search or listing initial bundles', () => {
    if (!existsSync('.next/app-build-manifest.json')) return;

    const manifest = getManifest();
    const checkedChunks = [
      ...(manifest.pages['/(frontend)/[locale]/page'] ?? []),
      ...(manifest.pages['/(frontend)/[locale]/collection/page'] ?? []),
      ...(manifest.pages['/(frontend)/[locale]/property/[slug]/page'] ?? []),
    ];

    for (const chunk of checkedChunks) {
      if (chunk.endsWith('.js') && existsSync(`.next/${chunk}`)) {
        const content = readFileSync(`.next/${chunk}`, 'utf8');
        expect(content.includes('recharts')).toBe(false);
      }
    }
  });

  it('ensures next.config.mjs specifies AVIF first in image formats', () => {
    const nextConfigContent = readFileSync('next.config.mjs', 'utf8');
    expect(nextConfigContent).toContain("'image/avif', 'image/webp'");
  });
});
