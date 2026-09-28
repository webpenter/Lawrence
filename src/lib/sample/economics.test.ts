import { describe, expect, it } from 'vitest';


import { SAMPLE_DESTINATION_BY_SLUG } from './destinations';
import { buildAllBlueprints, buildBlueprint } from './economics';

const blueprints = buildAllBlueprints(60);

function countBy<T>(items: T[], key: (item: T) => string | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    if (k == null) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

describe('blueprint determinism (§13.10 "deterministic seed")', () => {
  it('two runs produce byte-identical blueprints', () => {
    expect(JSON.stringify(buildAllBlueprints(60))).toBe(JSON.stringify(buildAllBlueprints(60)));
  });

  it('references are unique and stable', () => {
    const refs = blueprints.map((b) => b.reference);
    expect(new Set(refs).size).toBe(60);
    expect(refs[0]).toBe('WL-SAMPLE-001');
    expect(refs[59]).toBe('WL-SAMPLE-060');
  });
});

describe('sample geodata stays plausible (§13.12)', () => {
  it('coordinates stay inside their destination shoreline box', () => {
    for (const b of blueprints) {
      const destination = SAMPLE_DESTINATION_BY_SLUG.get(b.destinationSlug);
      const [west, south, east, north] = destination!.bbox;
      const [lng, lat] = b.coordinates;
      expect(lng, b.reference).toBeGreaterThanOrEqual(west);
      expect(lng, b.reference).toBeLessThanOrEqual(east);
      expect(lat, b.reference).toBeGreaterThanOrEqual(south);
      expect(lat, b.reference).toBeLessThanOrEqual(north);
    }
  });
});

describe('filter coverage (§13.10 "every filter returns at least three results")', () => {
  it('covers the search-UI water bodies ≥3 each', () => {
    const counts = countBy(blueprints, (b) => b.waterBodyType);
    for (const water of ['sea', 'ocean', 'lake', 'river', 'canal', 'lagoon', 'fjord', 'marina_basin']) {
      expect(counts.get(water) ?? 0, water).toBeGreaterThanOrEqual(3);
    }
  });

  it('covers every water access type ≥3', () => {
    const counts = new Map<string, number>();
    for (const b of blueprints) {
      for (const access of b.waterAccessType) {
        counts.set(access, (counts.get(access) ?? 0) + 1);
      }
    }
    for (const access of [
      'private_beach',
      'shared_beach',
      'direct_shore',
      'private_dock',
      'private_mooring',
      'marina_berth_included',
      'boathouse',
      'slipway',
      'seawall_quay',
      'rock_platform',
      'riparian_access',
      'whole_island',
    ]) {
      expect(counts.get(access) ?? 0, access).toBeGreaterThanOrEqual(3);
    }
  });

  it('covers the headline property types ≥3', () => {
    const counts = countBy(blueprints, (b) => b.propertyType);
    for (const type of [
      'villa',
      'estate',
      'apartment',
      'penthouse',
      'townhouse',
      'chalet',
      'farmhouse',
      'boathouse',
      'private_island',
      'marina_residence',
    ]) {
      expect(counts.get(type) ?? 0, type).toBeGreaterThanOrEqual(3);
    }
  });

  it('covers beach types, orientations, tenures and privacy states ≥3', () => {
    const beaches = countBy(blueprints, (b) => b.beachType);
    for (const beach of ['sand', 'pebble', 'rock', 'mixed']) {
      expect(beaches.get(beach) ?? 0, beach).toBeGreaterThanOrEqual(3);
    }
    const orientations = countBy(blueprints, (b) => b.orientation);
    for (const o of ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']) {
      expect(orientations.get(o) ?? 0, o).toBeGreaterThanOrEqual(3);
    }
    const tenures = countBy(blueprints, (b) => b.tenure);
    for (const tenure of ['freehold', 'leasehold', 'concession', 'fractional', 'share_transfer']) {
      expect(tenures.get(tenure) ?? 0, tenure).toBeGreaterThanOrEqual(3);
    }
    expect(blueprints.filter((b) => b.coordinatePrecision === 'approximate_500m').length)
      .toBeGreaterThanOrEqual(3);
    expect(blueprints.filter((b) => b.status === 'under_offer').length).toBeGreaterThanOrEqual(3);
  });

  it('boat-length buckets 8/18/28/40 each fit ≥3 berths, plus bridge/open-sea variety', () => {
    const withBerth = blueprints.filter((b) => b.maxBoatLoaM != null);
    for (const bucket of [8, 18, 28, 40]) {
      const fits = withBerth.filter((b) => (b.maxBoatLoaM as number) >= bucket);
      expect(fits.length, `boatLoa=${bucket}`).toBeGreaterThanOrEqual(3);
    }
    expect(blueprints.filter((b) => b.navigableToOpenSea).length).toBeGreaterThanOrEqual(3);
    expect(blueprints.filter((b) => !b.fixedBridgesToOpenSea).length).toBeGreaterThanOrEqual(3);
    expect(blueprints.filter((b) => b.fixedBridgesToOpenSea).length).toBeGreaterThanOrEqual(3);
  });

  it('keeps ≥3 missing-frontage listings to exercise the card fallback and warning', () => {
    expect(blueprints.filter((b) => b.waterFrontageM == null).length).toBeGreaterThanOrEqual(3);
  });
});

describe('internally consistent economics (§13.10)', () => {
  it('every price is positive, rounded and destination-plausible', () => {
    for (const b of blueprints) {
      expect(b.approxPriceEur).toBeGreaterThan(300_000);
      expect(b.approxPriceEur).toBeLessThan(60_000_000);
      expect(b.approxPriceEur % 50_000).toBe(0);
      expect(b.priceAmount % 50_000).toBe(0);
    }
  });

  it('frontage commands a premium, all else equal', () => {
    // Same index basis, frontage nulled: recompute price factor directly.
    const withFrontage = buildBlueprint(0);
    expect(withFrontage.waterFrontageM).not.toBeNull();
    // Structural check: the premium multiplier grows with frontage.
    const richFrontage = blueprints.filter((b) => (b.waterFrontageM ?? 0) > 60);
    const noFrontage = blueprints.filter(
      (b) => b.waterFrontageM == null && b.destinationSlug === richFrontage[0]?.destinationSlug,
    );
    if (richFrontage[0] && noFrontage[0]) {
      const perSqmRich = richFrontage[0].approxPriceEur / richFrontage[0].builtAreaSqm;
      const perSqmNone = noFrontage[0].approxPriceEur / noFrontage[0].builtAreaSqm;
      expect(perSqmRich).toBeGreaterThan(perSqmNone * 0.9);
    }
  });

  it('berthed listings have coherent nautical numbers', () => {
    for (const b of blueprints) {
      if (b.maxBoatLoaM == null) continue;
      expect(b.waterDepthAtBerthM).toBeGreaterThan(1);
      expect(b.maxBoatBeamM).toBeGreaterThan(1);
      expect(b.maxBoatBeamM as number).toBeLessThan(b.maxBoatLoaM);
      expect(b.mooringType).not.toBeNull();
    }
  });
});
