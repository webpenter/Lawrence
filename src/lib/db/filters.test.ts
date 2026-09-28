import { describe, expect, it } from 'vitest';

import type { Where } from 'payload';

import { filtersToWhere, publicPredicate, sortToPayload } from './filters';

function clauses(where: Where): Where[] {
  return (where.and ?? []) as Where[];
}

describe('publicPredicate (§8.2)', () => {
  it('always requires the public channel, a visible status, and a published version', () => {
    const and = clauses(publicPredicate());
    expect(and).toContainEqual({ channel: { equals: 'public' } });
    expect(and).toContainEqual({ status: { in: ['available', 'reserved', 'under_offer'] } });
    expect(and).toContainEqual({ moderation: { not_in: ['rejected', 'changes_requested'] } });
    expect(and).toContainEqual({ _status: { equals: 'published' } });
  });

  it('can never match an off-market listing', () => {
    // The channel clause is unconditional — the single §7.1 separation rule.
    const and = clauses(publicPredicate());
    expect(and.some((c) => 'channel' in c)).toBe(true);
  });

  it('excludes samples unless SAMPLE_DATA_ENABLED=true', () => {
    const prev = process.env.SAMPLE_DATA_ENABLED;
    process.env.SAMPLE_DATA_ENABLED = 'false';
    expect(clauses(publicPredicate())).toContainEqual({ isSample: { not_equals: true } });
    process.env.SAMPLE_DATA_ENABLED = 'true';
    expect(clauses(publicPredicate())).not.toContainEqual({ isSample: { not_equals: true } });
    process.env.SAMPLE_DATA_ENABLED = prev;
  });
});

describe('filtersToWhere (§11.2 browse controls)', () => {
  it('price range, tiers, beds, baths, areas, enums, country, market, status', () => {
    const and = clauses(
      filtersToWhere({
        priceMinEur: 20_000_000,
        priceMaxEur: 80_000_000,
        valueTiers: ['trophy', 'signature'],
        bedsMin: 6,
        bathsMin: 5,
        minBuiltSqm: 800,
        minPlotSqm: 5000,
        propertyTypes: ['villa', 'palazzo'],
        features: ['helipad'],
        tenures: ['freehold'],
        country: 'IT',
        destinationId: 7,
        status: 'available',
      }),
    );
    expect(and).toContainEqual({ priceEur: { greater_than_equal: 20_000_000 } });
    expect(and).toContainEqual({ priceEur: { less_than_equal: 80_000_000 } });
    expect(and).toContainEqual({ valueTier: { in: ['trophy', 'signature'] } });
    expect(and).toContainEqual({ bedrooms: { greater_than_equal: 6 } });
    expect(and).toContainEqual({ bathrooms: { greater_than_equal: 5 } });
    expect(and).toContainEqual({ builtAreaSqm: { greater_than_equal: 800 } });
    expect(and).toContainEqual({ plotAreaSqm: { greater_than_equal: 5000 } });
    expect(and).toContainEqual({ propertyType: { in: ['villa', 'palazzo'] } });
    expect(and).toContainEqual({ features: { in: ['helipad'] } });
    expect(and).toContainEqual({ tenure: { in: ['freehold'] } });
    expect(and).toContainEqual({ 'location.country': { equals: 'IT' } });
    expect(and).toContainEqual({ 'location.destination': { equals: 7 } });
    expect(and).toContainEqual({ status: { equals: 'available' } });
  });

  it('waterfront sub-block filters address the group fields', () => {
    const and = clauses(
      filtersToWhere({ waterAccess: true, waterBodyTypes: ['sea', 'lake'], minFrontageM: 25 }),
    );
    expect(and).toContainEqual({ 'waterfront.waterAccess': { equals: true } });
    expect(and).toContainEqual({ 'waterfront.waterBodyType': { in: ['sea', 'lake'] } });
    expect(and).toContainEqual({ 'waterfront.waterFrontageM': { greater_than_equal: 25 } });
  });

  it('map bbox becomes a polygon within-clause', () => {
    const and = clauses(filtersToWhere({ bbox: { west: 8, south: 43, east: 10, north: 45 } }));
    const bboxClause = and.find((c) => 'location.coordinates' in c);
    expect(bboxClause).toBeTruthy();
  });

  it('empty filters still apply the public predicate', () => {
    const and = clauses(filtersToWhere({}));
    expect(and).toHaveLength(1);
    expect(and[0]).toEqual(publicPredicate());
  });
});

describe('sortToPayload', () => {
  it('maps every sort option', () => {
    expect(sortToPayload('price_asc')).toBe('priceEur');
    expect(sortToPayload('price_desc')).toBe('-priceEur');
    expect(sortToPayload('newest')).toBe('-publishedAt');
    expect(sortToPayload(undefined)).toBe('-publishedAt');
  });
});
