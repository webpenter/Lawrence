import { sanitizePropertyForPublic } from '@/lib/db/sanitize';
import type { LngLat } from '@/lib/geo';

type AnyDoc = Record<string, unknown>;

function relId(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === 'object') return (value as { id?: number }).id;
  return value as number;
}

/**
 * Build the Typesense document for a listing. ALWAYS runs the §6.4/§6.6
 * privacy sanitization first — both indexes serve browsers, so approximate
 * listings carry only the jittered point and locality_only ones carry none,
 * for members exactly as for the public (§8.3: members get locality + circle,
 * never an address). Price obeys priceDisclosure on BOTH surfaces: exact →
 * priceEur; band → the EUR band; on_request → nothing. internalValueEur,
 * commissionTerms and owner data never appear in any search document.
 */
export function toSearchDocument(property: unknown): Record<string, unknown> {
  const doc = sanitizePropertyForPublic(property as { id: string | number } & AnyDoc) as AnyDoc;
  const location = (doc.location ?? {}) as AnyDoc;
  const waterfront = (doc.waterfront ?? {}) as AnyDoc;
  const coords = location.coordinates as LngLat | null | undefined;
  const disclosure = (doc.priceDisclosure as string | null) ?? 'on_request';

  return {
    id: String(doc.id),
    // Off-market listings have no slug — they are addressed by id (§6.1).
    slug: (doc.slug as string | null) ?? undefined,
    title: doc.title ?? '',
    status: doc.status ?? 'draft',
    isSample: Boolean(doc.isSample),
    valueTier: doc.valueTier ?? undefined,
    propertyType: doc.propertyType ?? undefined,
    priceDisclosure: disclosure,
    priceEur: disclosure === 'exact' ? ((doc.priceEur as number | null) ?? undefined) : undefined,
    priceBandMinEur:
      disclosure === 'band' ? ((doc.priceBandMinEur as number | null) ?? undefined) : undefined,
    priceBandMaxEur:
      disclosure === 'band' ? ((doc.priceBandMaxEur as number | null) ?? undefined) : undefined,
    features: (doc.features as string[] | null) ?? [],
    tenure: doc.tenure ?? undefined,
    bedrooms: (doc.bedrooms as number | null) ?? undefined,
    bathrooms: (doc.bathrooms as number | null) ?? undefined,
    builtAreaSqm: (doc.builtAreaSqm as number | null) ?? undefined,
    plotAreaSqm: (doc.plotAreaSqm as number | null) ?? undefined,
    waterAccess: Boolean(waterfront.waterAccess),
    waterBodyType: waterfront.waterBodyType ?? undefined,
    waterFrontageM: (waterfront.waterFrontageM as number | null) ?? undefined,
    country: (location.country as string | null) ?? undefined,
    locality: (location.locality as string | null) ?? undefined,
    region: (location.region as string | null) ?? undefined,
    destinationId: relId(location.destination),
    // Typesense geopoint is [lat, lng]. Already jittered/nulled by the
    // sanitizer above; `approximate` lets the map draw a circle, never a pin.
    location: Array.isArray(coords) ? [coords[1], coords[0]] : undefined,
    approximate: (location.coordinatePrecision ?? 'approximate_500m') !== 'exact',
    featured: Boolean(doc.featured),
    publishedAtTs: doc.publishedAt ? Date.parse(String(doc.publishedAt)) : undefined,
  };
}
