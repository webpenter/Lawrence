// Controlled vocabularies for Property, verbatim from spec §6.1–§6.4.
// CLAUDE.md rule 7: controlled enums over free text, always.

/** §6.1 — the single routing decision. */
export const CHANNELS = ['public', 'off_market'] as const;

/** §2.2 — admission tiers. prime is the exception track (€10–20M, admin decision). */
export const VALUE_TIERS = ['prime', 'trophy', 'signature'] as const;

export const PROPERTY_STATUSES = [
  'draft',
  'available',
  'reserved',
  'under_offer',
  'sold',
  'withdrawn',
  'expired',
  'archived',
] as const;

export const MODERATION_STATES = [
  'unreviewed',
  'approved',
  'rejected',
  'changes_requested',
] as const;

export const SOURCE_TYPES = ['manual', 'csv_import', 'feed', 'owner_submission'] as const;

export const PRICE_TYPES = ['fixed', 'on_request', 'price_band', 'auction'] as const;

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'AED', 'SGD', 'HKD'] as const;

/** §6.2 — what the public is told about the price. */
export const PRICE_DISCLOSURES = ['exact', 'band', 'on_request'] as const;

export const TENURES = ['freehold', 'leasehold', 'usufruct', 'concession'] as const;

export const OWNERSHIP_STRUCTURES = ['direct', 'spv', 'trust', 'foundation', 'company'] as const;

export const SALE_STRUCTURES = ['asset_sale', 'share_transfer', 'fractional', 'auction'] as const;

export const MANDATE_TYPES = ['exclusive', 'open', 'introduction_only'] as const;

export const PROPERTY_TYPES = [
  'villa',
  'estate',
  'penthouse',
  'townhouse',
  'chalet',
  'castle',
  'palazzo',
  'private_island',
  'vineyard_estate',
  'equestrian_estate',
  'hotel_resort',
  'development_site',
  'apartment',
  'lodge',
  'ranch',
] as const;

export const HERITAGE_STATUSES = ['none', 'listed', 'protected', 'unesco_area'] as const;

// §6.3 names the enum without fixing values; these five are logged in DECISIONS.md.
export const CONDITIONS = ['new', 'renovated', 'good', 'to_renovate', 'shell'] as const;

export const FEATURES = [
  'pool',
  'indoor_pool',
  'spa',
  'gym',
  'cinema',
  'wine_cellar',
  'ballroom',
  'library',
  'chapel',
  'helipad',
  'tennis',
  'padel',
  'golf_hole',
  'equestrian',
  'vineyard',
  'olive_grove',
  'beach',
  'private_dock',
  'marina_berth',
  'ski_in_ski_out',
  'gatehouse',
  'staff_quarters',
  'guest_houses',
  'generator',
  'geothermal',
  'solar',
  'smart_home',
  'car_gallery',
  'panic_room',
] as const;

/** §6.3 waterfront sub-block — the bridge to the sister portal. */
export const WATER_BODY_TYPES = [
  'sea',
  'ocean',
  'lake',
  'river',
  'lagoon',
  'canal',
  'fjord',
  'bay',
  'estuary',
] as const;

export const MOORING_TYPES = [
  'none',
  'buoy',
  'jetty',
  'pontoon',
  'fixed_dock',
  'floating_dock',
  'boat_lift',
  'marina_berth',
] as const;

/** §6.4 — disclosure control. Default approximate_500m; exact pins only where the seller permits. */
export const COORDINATE_PRECISIONS = ['exact', 'approximate_500m', 'locality_only'] as const;

/** §6.4 — the coarsest truthful label shown to anonymous visitors. */
export const PUBLIC_GEOGRAPHIES = ['country', 'region', 'market', 'locality'] as const;

/** §2.2 — admission policy, enforced in code. */
export const ADMISSION_FLOOR_EUR = 20_000_000;
export const PRIME_FLOOR_EUR = 10_000_000;
/** prime is capped at 10% of published inventory (§2.2). */
export const PRIME_CAP_RATIO = 0.1;

/** §9.3 — listing freshness cycle: expiry this many days after publication. */
export const LISTING_LIFETIME_DAYS = 120;

export type Channel = (typeof CHANNELS)[number];
export type ValueTier = (typeof VALUE_TIERS)[number];
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];
export type Currency = (typeof CURRENCIES)[number];
export type PriceDisclosure = (typeof PRICE_DISCLOSURES)[number];
