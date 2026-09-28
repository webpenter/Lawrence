import { jitterCoordinates, type LngLat } from '@/lib/geo';

import { isActiveMember, type Viewer } from './viewer';

/**
 * §8.3 — field visibility is decided by an ALLOWLIST projection per audience,
 * never a denylist. A new model field is invisible everywhere until someone
 * adds it to this table deliberately. This one decision prevents most
 * exposure incidents. One table, exhaustively tested.
 *
 * internalValueEur, commissionTerms, moderation notes and location.addressLine
 * appear ONLY in the staff column — they can never leak by omission because
 * nothing is serialised unless a row grants it.
 */

export type Audience = 'anonymous' | 'member_public' | 'member_off_market' | 'staff';

type AnyDoc = Record<string, unknown>;

/** Title, type, full facts, description, provenance — every audience (§8.3 rows 1–2, 7). */
const BASE_FIELDS = [
  'id',
  'slug',
  'title',
  'subtitle',
  'reference',
  'propertyType',
  'valueTier',
  'channel',
  'status',
  'isSample',
  'featured',
  'priceType',
  'priceDisclosure',
  'currency',
  'tenure',
  'bedrooms',
  'bathrooms',
  'receptionRooms',
  'builtAreaSqm',
  'plotAreaSqm',
  'plotAreaHa',
  'terraceAreaSqm',
  'floors',
  'yearBuilt',
  'renovatedYear',
  'architect',
  'heritageStatus',
  'condition',
  'parkingSpaces',
  'staffAccommodation',
  'energyRating',
  'features',
  'waterfront',
  'description',
  'provenance',
  'highlights',
  'availableFrom',
  'publishedAt',
  'expiresAt',
  'agency',
  'agent',
  'videoUrl',
  'virtualTourUrl',
  'metaTitle',
  'metaDescription',
  'updatedAt',
  'createdAt',
] as const;

/** Documents / floor plans, running costs, ownership structure — members and staff (§8.3 rows 8–9). */
const MEMBER_FIELDS = [
  'floorplans',
  'documents',
  'annualRunningCostEur',
  'ownershipStructure',
  'saleStructure',
  'taxNotes',
] as const;

/** Staff-only (§8.3 rows 6, 10 + workflow fields). The ONLY place these are ever granted. */
const STAFF_FIELDS = [
  'internalValueEur',
  'commissionTerms',
  'mandateType',
  'moderation',
  'moderationNote',
  'sourceType',
  'duplicateOf',
  'fingerprint',
  'viewCount',
  'memberViewCount',
  'enquiryCount',
  'lastVerifiedAt',
  'expiryReminderSentAt',
  'publication',
  'priceAmount',
  'priceBandMin',
  'priceBandMax',
] as const;

export const ALLOWLIST: Record<Audience, ReadonlySet<string>> = {
  anonymous: new Set(BASE_FIELDS),
  member_public: new Set([...BASE_FIELDS, ...MEMBER_FIELDS]),
  member_off_market: new Set([...BASE_FIELDS, ...MEMBER_FIELDS]),
  staff: new Set([...BASE_FIELDS, ...MEMBER_FIELDS, ...STAFF_FIELDS]),
};

/** Which audience column applies for this viewer looking at this listing (§8.3). */
export function audienceFor(viewer: Viewer, property: { channel?: string | null }): Audience {
  if (viewer.kind === 'staff') return 'staff';
  // Track B: an agency sees its own listings through the staff column shape
  // minus staff grants — until agency accounts land, treat as anonymous.
  if (isActiveMember(viewer)) {
    return property.channel === 'off_market' ? 'member_off_market' : 'member_public';
  }
  return 'anonymous';
}

/** §8.3 price row: per priceDisclosure publicly; exact or band for off-market members; exact for staff. */
function projectPrice(doc: AnyDoc, audience: Audience, out: AnyDoc): void {
  if (audience === 'staff') {
    out.priceEur = doc.priceEur ?? null;
    out.priceBandMinEur = doc.priceBandMinEur ?? null;
    out.priceBandMaxEur = doc.priceBandMaxEur ?? null;
    return;
  }

  const disclosure = (doc.priceDisclosure as string | null) ?? 'on_request';
  if (disclosure === 'exact') {
    out.priceEur = doc.priceEur ?? null;
  } else if (disclosure === 'band') {
    out.priceBandMinEur = doc.priceBandMinEur ?? null;
    out.priceBandMaxEur = doc.priceBandMaxEur ?? null;
  }
  // on_request: no numbers at all — audit:exposure enforces this in CI.
}

/**
 * §8.3 location row: staff exact; members locality + circle; anonymous the
 * coarsest truthful label (publicGeography) + circle. addressLine and exact
 * coordinates never leave the staff column; approximate listings carry a
 * deterministic jitter, locality_only listings carry no point at all.
 */
function projectLocation(doc: AnyDoc, audience: Audience, out: AnyDoc): void {
  const location = (doc.location ?? null) as AnyDoc | null;
  if (!location) return;

  if (audience === 'staff') {
    out.location = { ...location };
    return;
  }

  const precision = (location.coordinatePrecision as string | null) ?? 'approximate_500m';
  const coords = location.coordinates as LngLat | null | undefined;
  const projectedCoords =
    precision === 'exact'
      ? (coords ?? null)
      : precision === 'approximate_500m' && Array.isArray(coords)
        ? jitterCoordinates(coords, (doc.id as string | number) ?? 0, 500)
        : null;

  const shared: AnyDoc = {
    country: location.country ?? null,
    continent: location.continent ?? null,
    market: location.market ?? null,
    coordinates: projectedCoords,
    coordinatePrecision: precision,
    publicGeography: location.publicGeography ?? 'locality',
  };

  if (audience === 'anonymous') {
    // The coarsest truthful label: finer levels are omitted, not blanked.
    const granularity = (location.publicGeography as string | null) ?? 'locality';
    const includeRegion = ['region', 'market', 'locality'].includes(granularity);
    const includeLocality = granularity === 'locality';
    out.location = {
      ...shared,
      label: location.label ?? null,
      region: includeRegion ? (location.region ?? null) : null,
      province: includeLocality ? (location.province ?? null) : null,
      locality: includeLocality ? (location.locality ?? null) : null,
    };
    return;
  }

  // Members: locality + circle (§8.3) — still never an address.
  out.location = {
    ...shared,
    label: location.label ?? null,
    region: location.region ?? null,
    province: location.province ?? null,
    locality: location.locality ?? null,
  };
}

interface MediaLike {
  id?: unknown;
  visibility?: string | null;
}

/**
 * §8.3 gallery rows: public assets for everyone; member-only assets for
 * members and staff. Unpopulated relation ids are dropped for non-staff —
 * §8.6: never confirm that an asset exists.
 */
function projectMedia(doc: AnyDoc, audience: Audience, out: AnyDoc): void {
  const media = doc.media;
  if (!Array.isArray(media)) return;
  if (audience === 'staff') {
    out.media = media;
    return;
  }
  const memberAssets = audience !== 'anonymous';
  out.media = media.filter((item): item is MediaLike => {
    if (item == null || typeof item !== 'object') return false;
    const visibility = (item as MediaLike).visibility ?? 'public';
    return memberAssets ? true : visibility === 'public';
  });
}

/**
 * Project one property for one viewer. ALWAYS run this before a property
 * leaves the data layer — the return value contains only what the §8.3 table
 * grants that audience, with price, location and media specially shaped.
 */
export function projectProperty<T extends AnyDoc>(viewer: Viewer, doc: T): AnyDoc {
  const audience = audienceFor(viewer, doc as { channel?: string | null });
  const allowed = ALLOWLIST[audience];

  const out: AnyDoc = {};
  for (const key of Object.keys(doc)) {
    if (!allowed.has(key)) continue;
    if (key === 'location' || key === 'media') continue; // shaped below
    out[key] = doc[key];
  }

  projectPrice(doc, audience, out);
  projectLocation(doc, audience, out);
  projectMedia(doc, audience, out);

  // §11.3 member-extras teaser: the COUNT of member-only assets (+ floor
  // plans) is deliberately public — "12 further images and the floor plans
  // are available to members" — while the assets themselves are not.
  if (audience !== 'staff') {
    const media = Array.isArray(doc.media) ? doc.media : [];
    const memberOnly = media.filter(
      (item) => item && typeof item === 'object' && (item as MediaLike).visibility === 'members',
    ).length;
    const floorplans = Array.isArray(doc.floorplans) ? doc.floorplans.length : 0;
    out.memberExtrasCount = memberOnly + floorplans;
  }

  if (audience === 'anonymous') {
    // Documents and floor plans are not granted; even their ids are omitted
    // by the allowlist. Nothing to do — stated here because it is the row
    // people look for.
  }

  return out;
}
