import type { Where } from 'payload';

import type { Bbox } from '@/lib/geo';
import { withinBboxWhere } from '@/lib/geo';

/** Listing statuses a visitor may see (§11.3: sold/expired get designed states later). */
export const PUBLICLY_VISIBLE_STATUSES = ['available', 'reserved', 'under_offer'] as const;

// The complete public search surface (spec §11.2). Every field is optional;
// translation functions below turn this into a Payload Where (Postgres path)
// or a Typesense filter_by string (search path).
export interface PropertyFilters {
  priceMinEur?: number;
  priceMaxEur?: number;
  valueTiers?: string[];
  propertyTypes?: string[];
  features?: string[];
  bedsMin?: number;
  bathsMin?: number;
  minBuiltSqm?: number;
  minPlotSqm?: number;
  tenures?: string[];
  /** §6.3 waterfront sub-block — the bridge to the sister portal. */
  waterAccess?: boolean;
  waterBodyTypes?: string[];
  minFrontageM?: number;
  country?: string;
  /** The market relation id (§6.4 — field is renamed from destination in Prompt 4). */
  destinationId?: number;
  status?: (typeof PUBLICLY_VISIBLE_STATUSES)[number];
  bbox?: Bbox;
  sort?: 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  limit?: number;
}

/**
 * The public predicate (spec §8.2): public channel only, a publicly visible
 * status, a published version, moderation not negative (dormant in Phase 1 —
 * single-team entries stay `unreviewed`; Track B flips the queue on), and
 * isSample excluded unless SAMPLE_DATA_ENABLED=true. Every public query
 * starts here — no exceptions, ever. Off-market listings can never satisfy it.
 */
export function publicPredicate(): Where {
  const clauses: Where[] = [
    { channel: { equals: 'public' } },
    { status: { in: [...PUBLICLY_VISIBLE_STATUSES] } },
    { moderation: { not_in: ['rejected', 'changes_requested'] } },
    { _status: { equals: 'published' } },
  ];
  if (process.env.SAMPLE_DATA_ENABLED !== 'true') {
    clauses.push({ isSample: { not_equals: true } });
  }
  return { and: clauses };
}

/** PropertyFilters → Payload Where. The canonical Postgres query path. */
export function filtersToWhere(filters: PropertyFilters): Where {
  const and: Where[] = [publicPredicate()];

  if (filters.priceMinEur != null) and.push({ priceEur: { greater_than_equal: filters.priceMinEur } });
  if (filters.priceMaxEur != null) and.push({ priceEur: { less_than_equal: filters.priceMaxEur } });

  if (filters.valueTiers?.length) and.push({ valueTier: { in: filters.valueTiers } });
  if (filters.propertyTypes?.length) and.push({ propertyType: { in: filters.propertyTypes } });
  if (filters.features?.length) and.push({ features: { in: filters.features } });
  if (filters.bedsMin != null) and.push({ bedrooms: { greater_than_equal: filters.bedsMin } });
  if (filters.bathsMin != null) and.push({ bathrooms: { greater_than_equal: filters.bathsMin } });
  if (filters.minBuiltSqm != null) and.push({ builtAreaSqm: { greater_than_equal: filters.minBuiltSqm } });
  if (filters.minPlotSqm != null) and.push({ plotAreaSqm: { greater_than_equal: filters.minPlotSqm } });
  if (filters.tenures?.length) and.push({ tenure: { in: filters.tenures } });

  if (filters.waterAccess) and.push({ 'waterfront.waterAccess': { equals: true } });
  if (filters.waterBodyTypes?.length)
    and.push({ 'waterfront.waterBodyType': { in: filters.waterBodyTypes } });
  if (filters.minFrontageM != null)
    and.push({ 'waterfront.waterFrontageM': { greater_than_equal: filters.minFrontageM } });

  if (filters.country) and.push({ 'location.country': { equals: filters.country } });
  if (filters.destinationId != null)
    and.push({ 'location.destination': { equals: filters.destinationId } });
  if (filters.status) and.push({ status: { equals: filters.status } });

  if (filters.bbox) and.push(withinBboxWhere('location.coordinates', filters.bbox));

  return { and };
}

export function sortToPayload(sort: PropertyFilters['sort']): string {
  switch (sort) {
    case 'price_asc':
      return 'priceEur';
    case 'price_desc':
      return '-priceEur';
    case 'newest':
    default:
      return '-publishedAt';
  }
}
