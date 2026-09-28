import { describe, expect, it } from 'vitest';

import type { Property, Requirement } from '@/payload-types';

import { matchRequirement, rankMatches } from './match';

function listing(overrides: Partial<Property> = {}): Property {
  return {
    id: 1,
    title: 'Off-market palazzo',
    propertyType: 'palazzo',
    priceEur: 30_000_000,
    features: ['helipad', 'wine_cellar', 'private_dock'],
    location: { market: 7 },
    ...overrides,
  } as Property;
}

function requirement(overrides: Partial<Requirement> = {}): Requirement {
  return { id: 1, member: 1, status: 'active', ...overrides } as Requirement;
}

describe('matchRequirement (§8.8)', () => {
  it('budget overlap with ±10% grace at each end', () => {
    expect(
      matchRequirement(requirement({ budgetMinEur: 25_000_000, budgetMaxEur: 40_000_000 }), listing())
        .matches,
    ).toBe(true);
    // €30M listing vs max €28M: within the 10% grace (28×1.1 = 30.8).
    expect(
      matchRequirement(requirement({ budgetMaxEur: 28_000_000 }), listing()).matches,
    ).toBe(true);
    expect(
      matchRequirement(requirement({ budgetMaxEur: 25_000_000 }), listing()).matches,
    ).toBe(false);
    expect(
      matchRequirement(requirement({ budgetMinEur: 40_000_000 }), listing()).matches,
    ).toBe(false);
  });

  it('band-priced listings match on the band value', () => {
    const banded = listing({ priceEur: null, priceBandMaxEur: 35_000_000 });
    expect(
      matchRequirement(requirement({ budgetMinEur: 30_000_000, budgetMaxEur: 40_000_000 }), banded)
        .matches,
    ).toBe(true);
  });

  it('a budget requirement never matches a listing with no comparable value', () => {
    const noValue = listing({ priceEur: null, priceBandMinEur: null, priceBandMaxEur: null });
    expect(matchRequirement(requirement({ budgetMinEur: 20_000_000 }), noValue).matches).toBe(false);
  });

  it('markets and property types exclude when stated', () => {
    expect(matchRequirement(requirement({ markets: [7, 9] }), listing()).matches).toBe(true);
    expect(matchRequirement(requirement({ markets: [9] }), listing()).matches).toBe(false);
    expect(matchRequirement(requirement({ propertyTypes: ['villa'] }), listing()).matches).toBe(false);
    expect(matchRequirement(requirement({ propertyTypes: ['palazzo'] }), listing()).matches).toBe(true);
  });

  it('every must-have feature must be present', () => {
    expect(
      matchRequirement(requirement({ mustHaveFeatures: ['helipad', 'private_dock'] }), listing())
        .matches,
    ).toBe(true);
    const result = matchRequirement(requirement({ mustHaveFeatures: ['helipad', 'ballroom'] }), listing());
    expect(result.matches).toBe(false);
    expect(result.reasons[0]).toContain('ballroom');
  });

  it('an empty requirement matches everything at score zero', () => {
    const result = matchRequirement(requirement(), listing());
    expect(result.matches).toBe(true);
    expect(result.score).toBe(0);
  });

  it('rankMatches orders tighter requirements first', () => {
    const loose = requirement({ id: 1 });
    const tight = requirement({
      id: 2,
      budgetMinEur: 25_000_000,
      budgetMaxEur: 40_000_000,
      markets: [7],
      propertyTypes: ['palazzo'],
      mustHaveFeatures: ['helipad'],
    });
    const wrong = requirement({ id: 3, markets: [9] });
    const ranked = rankMatches([loose, tight, wrong], listing());
    expect(ranked.map((r) => r.requirement.id)).toEqual([2, 1]);
    expect(ranked[0]?.score).toBe(100);
  });
});
