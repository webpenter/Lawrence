import { describe, expect, it } from 'vitest';

import { buildAllBlueprints, buildBlueprint, SAMPLE_COUNT } from './economics';
import { SAMPLE_DESTINATIONS, SAMPLE_DESTINATION_BY_SLUG } from './markets';

describe('§13.10 Lawrence blueprint engine', () => {
  const all = buildAllBlueprints();

  it('is deterministic — two runs yield byte-identical blueprints', () => {
    expect(JSON.stringify(buildAllBlueprints())).toBe(JSON.stringify(buildAllBlueprints()));
    expect(buildBlueprint(7)).toEqual(buildBlueprint(7));
  });

  it('produces 45 listings: 30 public and 15 off-market', () => {
    expect(SAMPLE_COUNT).toBe(45);
    expect(all).toHaveLength(45);
    const offMarket = all.filter((b) => b.publication === 'off_market');
    expect(offMarket).toHaveLength(15);
  });

  it('covers all eighteen §15.4 markets', () => {
    const covered = new Set(all.map((b) => b.destinationSlug));
    expect(covered.size).toBe(18);
    for (const destination of SAMPLE_DESTINATIONS) {
      expect(covered.has(destination.slug), destination.slug).toBe(true);
    }
  });

  it('runs €10M–€180M with EXACTLY four prime exceptions and ~20% signature', () => {
    for (const b of all) {
      expect(b.approxPriceEur).toBeGreaterThanOrEqual(10_000_000);
      expect(b.approxPriceEur).toBeLessThanOrEqual(180_000_000);
    }
    const primes = all.filter((b) => b.primeException);
    expect(primes).toHaveLength(4);
    for (const prime of primes) {
      expect(prime.approxPriceEur).toBeLessThan(20_000_000);
      // The valve admits to the PUBLIC collection — never off-market-only.
      expect(prime.publication).not.toBe('off_market');
    }
    const signature = all.filter((b) => b.approxPriceEur >= 50_000_000);
    expect(signature.length).toBeGreaterThanOrEqual(7);
    expect(signature.length).toBeLessThanOrEqual(11);
    const nonPrime = all.filter((b) => !b.primeException);
    for (const b of nonPrime) {
      expect(b.approxPriceEur, b.reference).toBeGreaterThanOrEqual(20_000_000);
    }
  });

  it('represents every §12.2 price disclosure mode among public listings', () => {
    const publications = new Set(all.map((b) => b.publication));
    expect(publications.has('published_openly')).toBe(true);
    expect(publications.has('published_as_band')).toBe(true);
    expect(publications.has('published_without_price')).toBe(true);
    for (const b of all.filter((entry) => entry.publication === 'published_as_band')) {
      expect(b.priceBandMinEur).not.toBeNull();
      expect(b.priceBandMaxEur).not.toBeNull();
      expect(b.priceBandMaxEur!).toBeGreaterThan(b.priceBandMinEur!);
    }
  });

  it('keeps off-market coordinates imprecise (§8.3)', () => {
    for (const b of all.filter((entry) => entry.publication === 'off_market')) {
      expect(['approximate_500m', 'hidden']).toContain(b.coordinatePrecision);
    }
  });

  it('places coordinates inside each market bounding box', () => {
    for (const b of all) {
      const destination = SAMPLE_DESTINATION_BY_SLUG.get(b.destinationSlug)!;
      const [west, south, east, north] = destination.bbox;
      expect(b.coordinates[0]).toBeGreaterThanOrEqual(west);
      expect(b.coordinates[0]).toBeLessThanOrEqual(east);
      expect(b.coordinates[1]).toBeGreaterThanOrEqual(south);
      expect(b.coordinates[1]).toBeLessThanOrEqual(north);
    }
  });

  it('generates waterfront blocks only where the market has water', () => {
    for (const b of all) {
      const destination = SAMPLE_DESTINATION_BY_SLUG.get(b.destinationSlug)!;
      if (destination.waterBody == null) {
        expect(b.waterBodyType, b.reference).toBeNull();
        expect(b.waterFrontageM, b.reference).toBeNull();
      }
      if (b.maxBoatLoaM != null) {
        expect(b.waterFrontageM, b.reference).not.toBeNull();
      }
    }
  });

  it('references are stable Lawrence keys', () => {
    expect(all[0]!.reference).toBe('LPC-SAMPLE-001');
    expect(all[44]!.reference).toBe('LPC-SAMPLE-045');
    expect(new Set(all.map((b) => b.reference)).size).toBe(45);
  });
});
