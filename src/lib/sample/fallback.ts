import {
  composeDescription,
  composeTitle,
  DESCRIPTION_TEMPLATES,
  type DescriptionInput,
} from '@/content/description-templates';
import type { PropertyFilters } from '@/lib/db/filters';
import { textToLexical } from '@/lib/lexical';
import type { SearchHit, SearchResult } from '@/lib/search/client';
import type { Property } from '@/payload-types';

import { SAMPLE_DESTINATIONS, SAMPLE_DESTINATION_BY_SLUG } from './markets';
import { buildAllBlueprints, type ListingBlueprint } from './economics';

/**
 * In-memory demo inventory for environments with no reachable database
 * (sandboxes, preview deploys before infra). Strictly bounded:
 * - active ONLY when SAMPLE_DATA_ENABLED=true — the §13.12 demo-mode flag,
 *   which the launch checklist forces off;
 * - used ONLY on the database-error path, never to mask legitimate empty
 *   results (the computed empty state must keep working) and never when the
 *   database answered;
 * - unknown slugs still 404 — exact matches only, no catch-all listing;
 * - every record carries isSample=true, so the badge and noindex apply.
 * Content comes from the same deterministic blueprints and §13.8 grammar as
 * the real seed, with fixed timestamps.
 */

const FIXED_TS = '2026-09-01T00:00:00.000Z';

export function sampleFallbackEnabled(): boolean {
  return process.env.SAMPLE_DATA_ENABLED === 'true';
}

function grammarInput(b: ListingBlueprint): DescriptionInput {
  const destination = SAMPLE_DESTINATION_BY_SLUG.get(b.destinationSlug);
  return {
    index: b.index,
    propertyType: b.propertyType,
    locality: b.locality,
    destinationName: destination?.name ?? b.destinationSlug,
    waterBodyName: destination?.waterBody?.name ?? '',
    primaryAccess: b.waterFrontageM != null ? 'direct_shore' : '',
    beachType: 'sand',
    bedrooms: b.bedrooms,
    bathrooms: b.bathrooms,
    builtAreaSqm: b.builtAreaSqm,
    plotAreaSqm: b.plotAreaSqm,
    terraceAreaSqm: b.terraceAreaSqm,
    waterFrontageM: b.waterFrontageM,
    maxBoatLoaM: b.maxBoatLoaM,
    waterDepthAtBerthM:
      b.maxBoatLoaM != null ? Math.round((1.8 + b.maxBoatLoaM / 12) * 10) / 10 : null,
    nearestMarinaName: `${b.locality} Marina`,
    nearestMarinaDistanceKm: 1 + (b.index % 5),
    approxPriceEur: b.approxPriceEur,
  };
}

function blueprintToProperty(b: ListingBlueprint): Property {
  const destination = SAMPLE_DESTINATION_BY_SLUG.get(b.destinationSlug);
  const input = grammarInput(b);
  const en = DESCRIPTION_TEMPLATES.en!;
  const offMarket = b.publication === 'off_market';
  return {
    id: 100_000 + b.index,
    slug: offMarket ? undefined : `sample-${b.reference.toLowerCase()}`,
    reference: b.reference,
    agency: 0,
    status: b.status === 'in_market' ? 'available' : b.status,
    moderation: 'approved',
    channel: offMarket ? 'off_market' : 'public',
    publication: b.publication,
    priceDisclosure: offMarket
      ? 'exact'
      : b.publication === 'published_openly'
        ? 'exact'
        : b.publication === 'published_as_band'
          ? 'band'
          : 'on_request',
    priceBandMinEur: b.priceBandMinEur ?? undefined,
    priceBandMaxEur: b.priceBandMaxEur ?? undefined,
    valueTier:
      b.approxPriceEur >= 50_000_000 ? 'signature' : b.approxPriceEur >= 20_000_000 ? 'trophy' : 'prime',
    isSample: true,
    featured: b.featured,
    sourceType: 'manual',
    priceType: 'fixed',
    currency: b.currency,
    priceAmount: b.priceAmount,
    priceEur: b.approxPriceEur,
    tenure: b.tenure,
    propertyType: b.propertyType,
    bedrooms: b.bedrooms,
    bathrooms: b.bathrooms,
    builtAreaSqm: b.builtAreaSqm,
    plotAreaSqm: b.plotAreaSqm || undefined,
    terraceAreaSqm: b.terraceAreaSqm,
    yearBuilt: b.yearBuilt,
    condition: b.condition,
    features: b.features,
    waterfront: b.waterBodyType
      ? {
          waterAccess: true,
          waterBodyType: b.waterBodyType,
          waterFrontageM: b.waterFrontageM ?? undefined,
          mooringType: b.mooringType ?? undefined,
          maxBoatLoaM: b.maxBoatLoaM ?? undefined,
          berthCount: b.berthCount ?? undefined,
        }
      : undefined,
    location: {
      locality: b.locality,
      region: destination?.region,
      country: destination?.country,
      coordinates: b.coordinates,
      coordinatePrecision: b.coordinatePrecision,
    },
    title: composeTitle(input, en),
    description: textToLexical(composeDescription(input, en)),
    publishedAt: FIXED_TS,
    createdAt: FIXED_TS,
    updatedAt: FIXED_TS,
  } as unknown as Property;
}

// The public fallback surface never includes off-market rows (§5.3).
export const FALLBACK_PROPERTIES: Property[] = buildAllBlueprints()
  .filter((b) => b.publication !== 'off_market')
  .map(blueprintToProperty);

export const FALLBACK_FEATURED: Property[] = FALLBACK_PROPERTIES.filter((p) => p.featured).slice(
  0,
  6,
);

const BLUEPRINTS = buildAllBlueprints().filter((b) => b.publication !== 'off_market');

export const FALLBACK_DESTINATIONS = SAMPLE_DESTINATIONS.map((destination, index) => ({
  id: index + 1,
  name: destination.name,
  slug: destination.slug,
  count: BLUEPRINTS.filter((b) => b.destinationSlug === destination.slug).length,
}));

/** Exact-slug lookup — unknown slugs must keep 404ing. */
export function findFallbackProperty(slug: string): Property | null {
  return FALLBACK_PROPERTIES.find((property) => property.slug === slug) ?? null;
}

function matches(b: ListingBlueprint, filters: PropertyFilters): boolean {
  if (
    filters.waterBodyTypes?.length &&
    (b.waterBodyType == null || !filters.waterBodyTypes.includes(b.waterBodyType))
  )
    return false;
  if (filters.propertyTypes?.length && !filters.propertyTypes.includes(b.propertyType))
    return false;
  if (filters.features?.length && !filters.features.some((f) => b.features.includes(f)))
    return false;
  if (filters.minFrontageM != null && (b.waterFrontageM ?? 0) < filters.minFrontageM) return false;
  if (filters.bedsMin != null && b.bedrooms < filters.bedsMin) return false;
  if (filters.bathsMin != null && b.bathrooms < filters.bathsMin) return false;
  if (filters.priceMinEur != null && b.approxPriceEur < filters.priceMinEur) return false;
  if (filters.priceMaxEur != null && b.approxPriceEur > filters.priceMaxEur) return false;
  if (filters.tenures?.length && !filters.tenures.includes(b.tenure)) return false;
  if (filters.country) {
    const destination = SAMPLE_DESTINATION_BY_SLUG.get(b.destinationSlug);
    if (destination?.country !== filters.country) return false;
  }
  return true;
}

function toHit(property: Property, b: ListingBlueprint): SearchHit {
  const destination = SAMPLE_DESTINATION_BY_SLUG.get(b.destinationSlug);
  return {
    id: String(property.id),
    slug: property.slug ?? '',
    title: property.title,
    status: property.status,
    isSample: true,
    priceEur: property.priceEur ?? undefined,
    propertyType: property.propertyType,
    valueTier: property.valueTier ?? undefined,
    priceDisclosure: property.priceDisclosure,
    waterAccess: property.waterfront?.waterAccess ?? false,
    waterBodyType: property.waterfront?.waterBodyType ?? undefined,
    waterFrontageM: property.waterfront?.waterFrontageM ?? undefined,
    features: property.features ?? [],
    bedrooms: property.bedrooms ?? undefined,
    bathrooms: property.bathrooms ?? undefined,
    builtAreaSqm: property.builtAreaSqm ?? undefined,
    country: property.location?.country ?? undefined,
    locality: b.locality,
    region: destination?.region ?? undefined,
    location: [b.coordinates[1], b.coordinates[0]],
    approximate: b.coordinatePrecision === 'approximate_500m',
  };
}

/** Filter-honouring search over the demo inventory (DB-error path only). */
export function fallbackSearch(filters: PropertyFilters): SearchResult {
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 24, 100);
  const matched = BLUEPRINTS.filter((b) => matches(b, filters));
  const sorted = [...matched].sort((a, b) => {
    switch (filters.sort) {
      case 'price_asc':
        return a.approxPriceEur - b.approxPriceEur;
      case 'price_desc':
        return b.approxPriceEur - a.approxPriceEur;
      default:
        return a.index - b.index;
    }
  });
  const pageItems = sorted.slice((page - 1) * limit, page * limit);
  const byReference = new Map(FALLBACK_PROPERTIES.map((p) => [p.reference, p]));
  return {
    hits: pageItems.map((b) => toHit(byReference.get(b.reference) as Property, b)),
    total: matched.length,
    page,
    facets: {},
    engine: 'postgres',
  };
}
