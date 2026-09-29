import {
  SAMPLE_DESTINATIONS,
  type SampleDestination,
} from './markets';

/**
 * §13.10 blueprint engine: 45 deterministic listings — 30 public and 15
 * off-market — across the eighteen §15.4 markets. Values run €10M–€180M,
 * weighted so trophy dominates, signature is ~20%, and EXACTLY four prime
 * exceptions demonstrate the §2.2 10% valve. Every priceDisclosure mode is
 * represented. Pure and seeded — running it twice yields byte-identical
 * blueprints, which is what makes the seed idempotent.
 */

export type SamplePublication =
  | 'published_openly'
  | 'published_as_band'
  | 'published_without_price'
  | 'off_market';

export interface ListingBlueprint {
  index: number;
  reference: string;
  destinationSlug: string;
  locality: string;
  propertyType: string;
  currency: string;
  /** Local-currency asking price (what the CMS stores). */
  priceAmount: number;
  approxPriceEur: number;
  /** §8.4 — the one publication decision; channel/disclosure derive from it. */
  publication: SamplePublication;
  priceBandMinEur: number | null;
  priceBandMaxEur: number | null;
  /** §2.2 valve: exactly four €10–20M admissions across the set. */
  primeException: boolean;
  bedrooms: number;
  bathrooms: number;
  receptionRooms: number;
  builtAreaSqm: number;
  plotAreaSqm: number;
  terraceAreaSqm: number;
  yearBuilt: number;
  renovatedYear: number | null;
  condition: string;
  tenure: string;
  architect: string | null;
  heritageStatus: string;
  features: string[];
  /** Waterfront block — null for inland markets (§13.10 Lawrence shape). */
  waterBodyType: string | null;
  waterBodySlug: string | null;
  waterFrontageM: number | null;
  mooringType: string | null;
  berthCount: number | null;
  maxBoatLoaM: number | null;
  coordinates: [number, number];
  coordinatePrecision: 'exact' | 'approximate_500m' | 'hidden';
  status: 'in_market' | 'under_offer';
  featured: boolean;
}

/** mulberry32 — tiny deterministic PRNG; the fixed seed IS the §13.10 "deterministic seed". */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 0x4c505243; // "LPRC" — fixed forever for reproducibility.

export const SAMPLE_COUNT = 45;

/** The four §2.2 prime exceptions — fixed indices, all public. */
const PRIME_EXCEPTION_INDICES = [6, 15, 24, 33];
/** Nine signature listings (~20% of 45), disjoint from the primes. */
const SIGNATURE_INDICES = [0, 4, 10, 16, 22, 28, 34, 39, 44];

const TYPE_FACTOR: Record<string, number> = {
  villa: 1.0,
  estate: 1.3,
  penthouse: 1.15,
  apartment: 0.85,
  townhouse: 0.9,
  chalet: 1.05,
  lodge: 0.95,
  ranch: 1.1,
  castle: 1.35,
  palazzo: 1.25,
  vineyard_estate: 1.2,
  equestrian_estate: 1.15,
  private_island: 1.5,
};

const TENURE_CYCLE = ['freehold', 'freehold', 'leasehold', 'freehold', 'concession'] as const;
const CONDITION_CYCLE = ['renovated', 'good', 'new', 'renovated'] as const;
const FEATURE_POOL = [
  'pool',
  'infinity_pool',
  'gym',
  'spa',
  'staff_quarters',
  'elevator',
  'gated',
  'smart_home',
  'guest_house',
  'garage',
  'wine_cellar',
  'helipad',
  'cinema',
  'panic_room',
] as const;

/** Fictional architects (§13.12: never a real name) for roughly a third of the set. */
const ARCHITECT_POOL = [
  'Atelier Vionne',
  'Studio Caradonna',
  'Halvorsen & Reck',
  'Marguerite Devaux',
  'Obst + Linder',
] as const;

/**
 * Distribution: two listings in each of the 18 markets (indices 0–35), then
 * nine more in the flagship markets so the hub reads naturally.
 */
const EXTRA_MARKET_INDICES = [0, 1, 3, 13, 14, 15, 10, 12, 6];

function destinationFor(index: number): SampleDestination {
  if (index < 36) return SAMPLE_DESTINATIONS[index % 18] as SampleDestination;
  return SAMPLE_DESTINATIONS[
    EXTRA_MARKET_INDICES[index - 36] as number
  ] as SampleDestination;
}

function round(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function tierOf(index: number): 'prime' | 'trophy' | 'signature' {
  if (PRIME_EXCEPTION_INDICES.includes(index)) return 'prime';
  if (SIGNATURE_INDICES.includes(index)) return 'signature';
  return 'trophy';
}

/** §8.4: publication per index — off-market every third listing (15 of 45). */
export function publicationOf(index: number): SamplePublication {
  if (index % 3 === 2) return 'off_market';
  // Public listings cycle the three §12.2 price states.
  const publicSeq = index - Math.floor(index / 3);
  const cycle: SamplePublication[] = [
    'published_openly',
    'published_as_band',
    'published_without_price',
  ];
  return cycle[publicSeq % 3] as SamplePublication;
}

export function buildBlueprint(index: number): ListingBlueprint {
  const rand = mulberry32(SEED ^ (index * 0x9e3779b9));
  const destination = destinationFor(index);
  const tier = tierOf(index);
  const publication = publicationOf(index);

  const propertyType =
    destination.propertyTypes[index % destination.propertyTypes.length] as string;

  // Price first (the tier decides the band), then internally consistent area.
  const approxPriceEur =
    tier === 'prime'
      ? round(10_500_000 + rand() * 8_000_000, 250_000)
      : tier === 'signature'
        ? round(55_000_000 + rand() * 125_000_000, 1_000_000)
        : round(20_500_000 + rand() * 27_000_000, 500_000);

  const typeFactor = TYPE_FACTOR[propertyType] ?? 1;
  const luxuryFactor = 1.6 + rand() * 0.9; // trophy interiors trade far above the market median
  const builtAreaSqm = Math.max(
    180,
    Math.min(3_200, round(approxPriceEur / (destination.baseEurPerSqm * typeFactor * luxuryFactor), 10)),
  );
  const plotAreaSqm =
    propertyType === 'apartment' || propertyType === 'penthouse' || propertyType === 'townhouse'
      ? 0
      : round(
          builtAreaSqm *
            (propertyType === 'vineyard_estate' ||
            propertyType === 'equestrian_estate' ||
            propertyType === 'ranch' ||
            propertyType === 'estate'
              ? 20 + rand() * 120
              : 3 + rand() * 8),
          100,
        );
  const bedrooms = Math.max(3, Math.min(14, Math.round(builtAreaSqm / 110) + (rand() > 0.5 ? 1 : 0)));
  const bathrooms = Math.max(3, bedrooms - (rand() > 0.6 ? 0 : 1));
  const receptionRooms = Math.max(2, Math.round(bedrooms / 2));

  // Waterfront only in markets that have water, on roughly half the rows.
  const water = destination.waterBody ?? null;
  const hasWaterfront =
    water != null && ['villa', 'estate', 'palazzo', 'private_island'].includes(propertyType) &&
    index % 2 === 0;
  const waterFrontageM = hasWaterfront
    ? round(15 + rand() * (propertyType === 'private_island' ? 600 : 120), 1)
    : null;
  const hasBerth = hasWaterfront && water.type !== 'ocean' && index % 4 === 0;
  const maxBoatLoaM = hasBerth ? round(12 + rand() * 30, 0.5) : null;

  const heritageStatus =
    propertyType === 'castle' || propertyType === 'palazzo'
      ? (['listed', 'protected', 'unesco_area'] as const)[index % 3]!
      : index % 9 === 4
        ? 'listed'
        : 'none';

  const eurToLocal: Record<string, number> = { EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.94, AED: 3.97 };
  const priceAmount = round(approxPriceEur * (eurToLocal[destination.currency] ?? 1), 100_000);

  // §12.2 band: a guide range around the internal figure, rounded to €1M.
  const band = publication === 'published_as_band';
  const priceBandMinEur = band ? round(approxPriceEur * 0.92, 1_000_000) : null;
  const priceBandMaxEur = band ? round(approxPriceEur * 1.1, 1_000_000) : null;

  const [west, south, east, north] = destination.bbox;
  const coordinates: [number, number] = [
    Number((west + rand() * (east - west)).toFixed(5)),
    Number((south + rand() * (north - south)).toFixed(5)),
  ];

  const yearBuilt =
    propertyType === 'castle' || propertyType === 'palazzo'
      ? 1500 + Math.round(rand() * 350)
      : 1900 + Math.round(rand() * 120);

  return {
    index,
    reference: `LPC-SAMPLE-${String(index + 1).padStart(3, '0')}`,
    destinationSlug: destination.slug,
    locality: destination.localities[index % destination.localities.length] as string,
    propertyType,
    currency: destination.currency,
    priceAmount,
    approxPriceEur,
    publication,
    priceBandMinEur,
    priceBandMaxEur,
    primeException: tier === 'prime',
    bedrooms,
    bathrooms,
    receptionRooms,
    builtAreaSqm,
    plotAreaSqm,
    terraceAreaSqm: round(builtAreaSqm * (0.1 + rand() * 0.3), 5),
    yearBuilt,
    renovatedYear: index % 3 === 0 ? 2015 + (index % 10) : null,
    condition: CONDITION_CYCLE[index % CONDITION_CYCLE.length] as string,
    tenure: TENURE_CYCLE[index % TENURE_CYCLE.length] as string,
    architect: index % 3 === 1 ? (ARCHITECT_POOL[index % ARCHITECT_POOL.length] as string) : null,
    heritageStatus,
    features: FEATURE_POOL.filter((_, f) => (index + f) % 3 === 0).slice(0, 6),
    waterBodyType: hasWaterfront ? water.type : null,
    waterBodySlug: hasWaterfront ? water.slug : null,
    waterFrontageM,
    mooringType: hasBerth ? (['fixed_dock', 'jetty', 'buoy'] as const)[index % 3]! : null,
    berthCount: hasBerth ? 1 + (index % 2) : null,
    maxBoatLoaM,
    coordinates,
    // §8.3: off-market coordinates are never exact.
    coordinatePrecision:
      publication === 'off_market'
        ? index % 2 === 0
          ? 'approximate_500m'
          : 'hidden'
        : index % 5 === 2
          ? 'approximate_500m'
          : 'exact',
    status: index % 11 === 5 ? 'under_offer' : 'in_market',
    featured: publication !== 'off_market' && index < 9,
  };
}

export function buildAllBlueprints(count = SAMPLE_COUNT): ListingBlueprint[] {
  return Array.from({ length: count }, (_, index) => buildBlueprint(index));
}
