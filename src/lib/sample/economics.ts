import {
  SAMPLE_DESTINATIONS,
  type SampleDestination,
} from './markets';

/**
 * §13.10 blueprint engine: 60 deterministic listings with internally
 * consistent economics (price correlated with destination, type, area and
 * frontage) and enough water/nautical variety that every search-UI filter
 * returns at least three results. Pure and seeded — running it twice yields
 * byte-identical blueprints, which is what makes the seed idempotent.
 */

export interface ListingBlueprint {
  index: number;
  reference: string;
  destinationSlug: string;
  locality: string;
  propertyType: string;
  currency: string;
  priceAmount: number;
  approxPriceEur: number;
  bedrooms: number;
  bathrooms: number;
  builtAreaSqm: number;
  plotAreaSqm: number;
  terraceAreaSqm: number;
  yearBuilt: number;
  condition: string;
  tenure: string;
  features: string[];
  waterBodyType: string;
  waterBodySlug: string;
  waterAccessType: string[];
  distanceToWaterM: number;
  waterFrontageM: number | null;
  beachType: string;
  orientation: string;
  swimmableFromProperty: boolean;
  shorelineTenure: string;
  mooringType: string | null;
  berthCount: number | null;
  maxBoatLoaM: number | null;
  maxBoatBeamM: number | null;
  waterDepthAtBerthM: number | null;
  navigableToOpenSea: boolean;
  fixedBridgesToOpenSea: boolean;
  minBridgeClearanceM: number | null;
  nearestMarinaName: string;
  nearestMarinaDistanceKm: number;
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

const SEED = 0x57a73271; // "WATER" — fixed forever for reproducibility.

const TYPE_FACTOR: Record<string, number> = {
  villa: 1.0,
  estate: 1.25,
  penthouse: 1.15,
  apartment: 0.8,
  farmhouse: 0.75,
  chalet: 0.7,
  townhouse: 0.85,
  boathouse: 0.6,
  private_island: 1.6,
  marina_residence: 0.9,
};

const AREA_BY_TYPE: Record<string, [number, number]> = {
  villa: [280, 780],
  estate: [600, 1400],
  penthouse: [180, 420],
  apartment: [110, 260],
  farmhouse: [260, 620],
  chalet: [140, 360],
  townhouse: [180, 420],
  boathouse: [90, 220],
  private_island: [300, 900],
  marina_residence: [140, 380],
};

// Search-UI coverage cycles (§13.10 "every filter returns at least three
// results"): stamped round-robin so each value lands ≥3 times across 60.
const ACCESS_CYCLE = [
  'private_dock',
  'private_beach',
  'direct_shore',
  'private_mooring',
  'shared_beach',
  'marina_berth_included',
  'boathouse',
  'slipway',
  'seawall_quay',
  'rock_platform',
  'riparian_access',
] as const;
const BEACH_CYCLE = ['sand', 'pebble', 'rock', 'mixed'] as const;
const ORIENTATION_CYCLE = ['S', 'SW', 'W', 'SE', 'E', 'NW', 'N', 'NE'] as const;
const TENURE_CYCLE = ['freehold', 'leasehold', 'concession', 'fractional', 'share_transfer'] as const;
const SHORELINE_CYCLE = [
  'private_to_waterline',
  'private_to_high_water',
  'state_concession',
  'public_easement',
  'riparian_rights',
] as const;
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
  'solar',
] as const;

function destinationFor(index: number): SampleDestination {
  // 48 across the 12 main markets, then 6 fjord + 6 canal outliers (§13.10).
  if (index < 48) return SAMPLE_DESTINATIONS[index % 12] as SampleDestination;
  if (index < 54) return SAMPLE_DESTINATIONS[12] as SampleDestination; // fjords
  return SAMPLE_DESTINATIONS[13] as SampleDestination; // amsterdam
}

function round(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function buildBlueprint(index: number): ListingBlueprint {
  const rand = mulberry32(SEED ^ (index * 0x9e3779b9));
  const destination = destinationFor(index);

  // Property type: destination pool cycling, with global ≥3 guarantees for the
  // rarer types stamped at fixed indices.
  let propertyType =
    destination.propertyTypes[index % destination.propertyTypes.length] as string;
  if ([3, 15, 27].includes(index)) propertyType = 'penthouse';
  if ([6, 18, 30].includes(index)) propertyType = 'townhouse';
  if ([9, 21, 33].includes(index)) propertyType = 'boathouse';
  if ([1, 13, 25].includes(index)) propertyType = 'apartment';
  if ([4, 16, 28].includes(index)) propertyType = 'farmhouse';
  if ([10, 22, 34].includes(index)) propertyType = 'chalet';
  if ([48, 49, 50].includes(index)) propertyType = 'chalet';
  if ([2, 14, 26].includes(index)) propertyType = 'estate';
  if ([7, 19, 31].includes(index)) propertyType = 'private_island';
  if ([8, 20, 32].includes(index)) propertyType = 'marina_residence';

  // Water body: destination default with the coverage overrides —
  // Amstel river rows, Chalk Sound lagoon rows, marina-basin rows.
  let waterBodyType = destination.waterBodyType;
  let waterBodySlug = destination.waterBody.slug;
  if ([54, 56, 58].includes(index)) {
    waterBodyType = 'river';
    waterBodySlug = 'amstel-river';
  }
  if (destination.slug === 'turks-caicos' && [11, 23, 35].includes(index)) {
    waterBodyType = 'lagoon';
    waterBodySlug = 'chalk-sound-lagoon';
  }
  if (propertyType === 'marina_residence') {
    waterBodyType = 'marina_basin';
    waterBodySlug = `${destination.slug}-marina-basin`;
  }
  if (destination.slug === 'lake-como') waterBodyType = 'lake';

  // Access types: primary from the coverage cycle (validated against water
  // body plausibility), plus whole_island for island listings.
  const primaryAccess = ACCESS_CYCLE[index % ACCESS_CYCLE.length] as string;
  const accessSet = new Set<string>([primaryAccess]);
  if (propertyType === 'private_island') accessSet.add('whole_island');
  if (rand() > 0.5) accessSet.add(ACCESS_CYCLE[(index + 4) % ACCESS_CYCLE.length] as string);
  const waterAccessType = [...accessSet];

  const [areaMin, areaMax] = AREA_BY_TYPE[propertyType] ?? [200, 500];
  const builtAreaSqm = round(areaMin + rand() * (areaMax - areaMin), 10);
  const plotAreaSqm =
    propertyType === 'apartment' || propertyType === 'penthouse'
      ? 0
      : round(builtAreaSqm * (1.8 + rand() * 4), 50);
  const bedrooms = Math.max(1, Math.min(12, Math.round(builtAreaSqm / 95) + (rand() > 0.5 ? 1 : 0)));
  const bathrooms = Math.max(1, bedrooms - (rand() > 0.6 ? 0 : 1));

  const hasFrontage = index % 5 !== 4; // ~80% carry the headline stat; rest exercise the warning.
  const waterFrontageM = hasFrontage
    ? round(8 + rand() * (propertyType === 'private_island' ? 400 : 80), 1)
    : null;

  const distanceToWaterM = index % 7 === 6 ? Math.round(10 + rand() * 40) : 0;

  // Nautical block: dock-like access always berths a boat; sizes spread so
  // boat-length buckets 8/18/28/40/60 all return results.
  const nauticalAccess = ['private_dock', 'private_mooring', 'marina_berth_included', 'boathouse', 'slipway'];
  const hasBerth = waterAccessType.some((a) => nauticalAccess.includes(a));
  const loaBucket = [10, 16, 22, 26, 32, 45, 65][index % 7] as number;
  const maxBoatLoaM = hasBerth ? round(loaBucket * (0.9 + rand() * 0.3), 0.5) : null;
  const waterDepthAtBerthM = hasBerth ? round(1.6 + (maxBoatLoaM as number) / 14 + rand(), 0.1) : null;
  const maxBoatBeamM = hasBerth ? round((maxBoatLoaM as number) / 3.4, 0.1) : null;
  const berthCount = hasBerth ? 1 + (index % 3) : null;

  const openWater = ['sea', 'ocean', 'fjord', 'bay', 'lagoon'].includes(waterBodyType);
  const navigableToOpenSea = openWater || (waterBodyType !== 'lake' && index % 3 !== 0);
  const fixedBridgesToOpenSea = !openWater && index % 2 === 0 && waterBodyType !== 'lake';
  const minBridgeClearanceM = fixedBridgesToOpenSea ? round(3 + rand() * 15, 0.5) : null;

  // Internally consistent economics: destination base × type factor × area,
  // with a frontage premium and bounded noise (§13.10).
  const frontagePremium = 1 + ((waterFrontageM ?? 0) / 100) * 0.8;
  const noise = 0.85 + rand() * 0.3;
  const typeFactor = TYPE_FACTOR[propertyType] ?? 1;
  const approxPriceEur = round(
    destination.baseEurPerSqm * builtAreaSqm * typeFactor * frontagePremium * noise,
    50_000,
  );
  const eurToLocal: Record<string, number> = { EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.94 };
  const priceAmount = round(approxPriceEur * (eurToLocal[destination.currency] ?? 1), 50_000);

  const [west, south, east, north] = destination.bbox;
  const coordinates: [number, number] = [
    Number((west + rand() * (east - west)).toFixed(5)),
    Number((south + rand() * (north - south)).toFixed(5)),
  ];

  return {
    index,
    reference: `WL-SAMPLE-${String(index + 1).padStart(3, '0')}`,
    destinationSlug: destination.slug,
    locality: destination.localities[index % destination.localities.length] as string,
    propertyType,
    currency: destination.currency,
    priceAmount,
    approxPriceEur,
    bedrooms,
    bathrooms,
    builtAreaSqm,
    plotAreaSqm,
    terraceAreaSqm: round(builtAreaSqm * (0.1 + rand() * 0.25), 5),
    yearBuilt: 1930 + Math.round(rand() * 90),
    condition: (['renovated', 'good', 'new', 'to_renovate'] as const)[index % 4] as string,
    tenure: TENURE_CYCLE[index % TENURE_CYCLE.length] as string,
    features: FEATURE_POOL.filter((_, f) => (index + f) % 3 === 0).slice(0, 6),
    waterBodyType,
    waterBodySlug,
    waterAccessType,
    distanceToWaterM,
    waterFrontageM,
    beachType: BEACH_CYCLE[index % BEACH_CYCLE.length] as string,
    orientation: ORIENTATION_CYCLE[index % ORIENTATION_CYCLE.length] as string,
    swimmableFromProperty: openWater && index % 4 !== 0,
    shorelineTenure: SHORELINE_CYCLE[index % SHORELINE_CYCLE.length] as string,
    mooringType: hasBerth
      ? ((['fixed_dock', 'floating_dock', 'jetty', 'buoy', 'marina_berth'] as const)[
          index % 5
        ] as string)
      : null,
    berthCount,
    maxBoatLoaM,
    maxBoatBeamM,
    waterDepthAtBerthM,
    navigableToOpenSea,
    fixedBridgesToOpenSea,
    minBridgeClearanceM,
    nearestMarinaName: `${destination.localities[0]} Marina`,
    nearestMarinaDistanceKm: round(0.4 + rand() * 9, 0.1),
    coordinates,
    coordinatePrecision:
      index % 5 === 2 ? 'approximate_500m' : index % 17 === 13 ? 'hidden' : 'exact',
    status: index % 12 === 5 ? 'under_offer' : 'in_market',
    featured: index < 6,
  };
}

export function buildAllBlueprints(count = 60): ListingBlueprint[] {
  return Array.from({ length: count }, (_, index) => buildBlueprint(index));
}
