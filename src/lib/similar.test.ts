import { describe, expect, it } from 'vitest';

import type { Property } from '@/payload-types';

import { isSimilar, rankSimilar } from './similar';

function listing(overrides: Partial<Property>): Property {
  return {
    id: 1,
    title: 'Subject',
    propertyType: 'villa',
    priceType: 'fixed',
    currency: 'EUR',
    channel: 'public',
    valueTier: 'trophy',
    agency: 1,
    status: 'available',
    moderation: 'approved',
    sourceType: 'manual',
    priceEur: 30_000_000,
    location: { destination: 5 },
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as Property;
}

const subject = listing({ id: 1 });

describe('isSimilar (§11.3: comparable properties in the same market and band)', () => {
  it('accepts price within ±35% even in another market', () => {
    expect(isSimilar(subject, listing({ id: 2, priceEur: 36_000_000, location: {} }))).toBe(true);
    expect(isSimilar(subject, listing({ id: 3, priceEur: 20_000_000, location: {} }))).toBe(true);
  });

  it('rejects price outside ±35% when the market differs', () => {
    expect(
      isSimilar(subject, listing({ id: 4, priceEur: 60_000_000, location: { destination: 9 } })),
    ).toBe(false);
  });

  it('accepts the same market even when price is far apart', () => {
    expect(
      isSimilar(subject, listing({ id: 5, priceEur: 75_000_000, location: { destination: 5 } })),
    ).toBe(true);
  });

  it('rejects off-market candidates outright (§8.2)', () => {
    expect(isSimilar(subject, listing({ id: 6, channel: 'off_market' }))).toBe(false);
  });

  it('rejects sold and expired listings', () => {
    expect(isSimilar(subject, listing({ id: 7, status: 'sold' }))).toBe(false);
    expect(isSimilar(subject, listing({ id: 8, status: 'expired' }))).toBe(false);
  });

  it('never returns the subject itself', () => {
    expect(isSimilar(subject, subject)).toBe(false);
  });
});

describe('rankSimilar', () => {
  it('prefers same market, then closest price, and respects the limit', () => {
    const candidates = [
      listing({ id: 20, priceEur: 39_000_000, location: { destination: 9 } }),
      listing({ id: 21, priceEur: 31_000_000, location: { destination: 9 } }),
      listing({ id: 22, priceEur: 72_000_000, location: { destination: 5 } }),
      listing({ id: 23, status: 'sold' }),
    ];
    const ranked = rankSimilar(subject, candidates, 2);
    expect(ranked.map((r) => r.id)).toEqual([22, 21]);
  });
});
