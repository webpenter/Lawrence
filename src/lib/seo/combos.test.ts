import { describe, expect, it } from 'vitest';

import type { LandingPage } from '@/payload-types';

import {
  comboToFilters,
  comboToSearchQuery,
  normalizeComboSlug,
  passesEditorialGate,
  rankSiblings,
} from './combos';

function page(overrides: Partial<LandingPage> & { id: number }): LandingPage {
  return {
    title: `Page ${overrides.id}`,
    slug: `page-${overrides.id}`,
    _status: 'published',
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as LandingPage;
}

const longIntro = {
  root: {
    children: [
      {
        children: [
          {
            text: 'Liguria has the tightest coastline in Italy and the least of it in private hands, with genuine sea access starting well above typical regional prices.',
          },
        ],
      },
    ],
  },
} as unknown as LandingPage['intro'];

describe('normalizeComboSlug (§5.4: exactly one canonical URL per combination)', () => {
  it('is identity for canonical slugs', () => {
    expect(normalizeComboSlug('villas-sea-liguria')).toBe('villas-sea-liguria');
    expect(normalizeComboSlug('private-dock-homes-florida-keys')).toBe(
      'private-dock-homes-florida-keys',
    );
  });

  it('normalises casing, separators and encoding', () => {
    expect(normalizeComboSlug('Villas--Sea--Liguria')).toBe('villas-sea-liguria');
    expect(normalizeComboSlug('villas%20sea%20liguria')).toBe('villas-sea-liguria');
  });

  it('canonicalises singular/synonym segments', () => {
    expect(normalizeComboSlug('villa-sea-liguria')).toBe('villas-sea-liguria');
    expect(normalizeComboSlug('lakefront-villas-lake-como')).toBe('lakefront-villas-como');
    expect(normalizeComboSlug('waterfront-estates-cote-d-azur')).toBe(
      'waterfront-estates-cote-dazur',
    );
    expect(normalizeComboSlug('oceanfront-villas-amalfi-coast')).toBe(
      'seafront-villas-amalfi-coast',
    );
  });
});

describe('comboToFilters / comboToSearchQuery', () => {
  const combo = page({
    id: 1,
    combo: { propertyType: 'villa', waterBodyType: 'sea', country: 'IT', destination: 5 },
  });

  it('maps the combo group onto the filter surface', () => {
    expect(comboToFilters(combo)).toEqual({
      propertyTypes: ['villa'],
      waterBodyTypes: ['sea'],
      country: 'IT',
      marketId: 5,
    });
  });

  it('builds the §5.5 "view all" query', () => {
    expect(comboToSearchQuery(combo)).toBe('?type=villa&water=sea&country=IT');
  });
});

describe('passesEditorialGate (§5.4: no thin-content combinations)', () => {
  it('rejects drafts and empty intros', () => {
    expect(passesEditorialGate(page({ id: 1, _status: 'draft', intro: longIntro }))).toBe(false);
    expect(passesEditorialGate(page({ id: 2, intro: null }))).toBe(false);
  });

  it('accepts a published page with a real intro', () => {
    expect(passesEditorialGate(page({ id: 3, intro: longIntro }))).toBe(true);
  });
});

describe('rankSiblings (§10.4: 6–10 contextual internal links)', () => {
  it('prefers shared destination, then country/water, excludes self, caps the list', () => {
    const current = page({
      id: 1,
      combo: { propertyType: 'villa', waterBodyType: 'sea', country: 'IT', destination: 5 },
    });
    const candidates = [
      current,
      page({ id: 2, combo: { waterBodyType: 'lake', country: 'CH', destination: 9 } }),
      page({ id: 3, combo: { propertyType: 'estate', country: 'IT', destination: 5 } }),
      page({ id: 4, combo: { waterBodyType: 'sea', country: 'IT', destination: 7 } }),
    ];
    const ranked = rankSiblings(current, candidates, 2);
    expect(ranked.map((r) => r.id)).toEqual([3, 4]);
  });
});
