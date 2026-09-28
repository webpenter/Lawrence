import { describe, expect, it } from 'vitest';

import { distanceMeters, type LngLat } from '@/lib/geo';

import { toSearchDocument } from './document';

const EXACT: LngLat = [9.2099, 44.3034];

function listing(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 42,
    slug: 'palazzo-portofino',
    title: 'Palazzo sul Mare',
    status: 'available',
    isSample: false,
    valueTier: 'trophy',
    propertyType: 'palazzo',
    priceDisclosure: 'exact',
    priceEur: 34_500_000,
    internalValueEur: 36_000_000,
    commissionTerms: 'CONFIDENTIAL',
    location: {
      addressLine: 'Via Roma 1',
      locality: 'Portofino',
      region: 'Liguria',
      country: 'IT',
      coordinates: EXACT,
      coordinatePrecision: 'approximate_500m',
    },
    ...overrides,
  };
}

// Prompt 6 gate: exact coordinates never appear in the public API surface.
describe('toSearchDocument — the coordinates rule', () => {
  it('approximate_500m: the indexed point is jittered, never the exact one', () => {
    const doc = toSearchDocument(listing());
    const [lat, lng] = doc.location as [number, number];
    expect([lng, lat]).not.toEqual(EXACT);
    const d = distanceMeters(EXACT, [lng, lat]);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(1100);
    expect(doc.approximate).toBe(true);
  });

  it('the jitter is deterministic — the circle never moves between requests', () => {
    const a = toSearchDocument(listing());
    const b = toSearchDocument(listing());
    expect(a.location).toEqual(b.location);
  });

  it('locality_only: no point is indexed at all', () => {
    const doc = toSearchDocument(
      listing({
        location: { ...listing().location as object, coordinatePrecision: 'locality_only' },
      }),
    );
    expect(doc.location).toBeUndefined();
  });

  it('exact precision passes the true pin (the seller permitted it, §4.8)', () => {
    const doc = toSearchDocument(
      listing({
        location: { ...listing().location as object, coordinatePrecision: 'exact' },
      }),
    );
    expect(doc.location).toEqual([EXACT[1], EXACT[0]]);
    expect(doc.approximate).toBe(false);
  });
});

describe('toSearchDocument — the confidentiality rules', () => {
  it('never carries addressLine, internalValueEur or commissionTerms', () => {
    const serialized = JSON.stringify(toSearchDocument(listing()));
    expect(serialized).not.toContain('Via Roma');
    expect(serialized).not.toContain('36000000');
    expect(serialized).not.toContain('CONFIDENTIAL');
  });

  it('price obeys priceDisclosure: on_request indexes no numbers', () => {
    const doc = toSearchDocument(
      listing({ priceDisclosure: 'on_request', priceEur: 34_500_000 }),
    );
    expect(doc.priceEur).toBeUndefined();
    expect(doc.priceBandMinEur).toBeUndefined();
  });

  it('band discloses only the EUR band', () => {
    const doc = toSearchDocument(
      listing({
        priceDisclosure: 'band',
        priceEur: 34_500_000,
        priceBandMinEur: 30_000_000,
        priceBandMaxEur: 40_000_000,
      }),
    );
    expect(doc.priceEur).toBeUndefined();
    expect(doc.priceBandMinEur).toBe(30_000_000);
    expect(doc.priceBandMaxEur).toBe(40_000_000);
  });
});
