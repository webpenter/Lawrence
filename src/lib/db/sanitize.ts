import { jitterCoordinates, type LngLat } from '@/lib/geo';

interface LocationLike {
  addressLine?: string | null;
  coordinates?: LngLat | null;
  coordinatePrecision?: string | null;
}

interface PropertyLike {
  id: string | number;
  location?: LocationLike | null;
}

/**
 * Privacy sanitization (spec §6.6) applied to EVERY property leaving the data
 * layer for a public consumer:
 * - addressLine is admin-only and is always removed;
 * - approximate_500m (the §6.4 default, so it also applies when precision is
 *   unset): coordinates are replaced by a deterministic jitter seeded by the
 *   listing id (the circle never moves between requests) — the exact point
 *   must never reach the client. Verify in the network tab, not the UI;
 * - locality_only: coordinates are removed entirely.
 */
export function sanitizePropertyForPublic<T extends PropertyLike>(doc: T): T {
  if (!doc.location) return doc;

  const location: LocationLike & Record<string, unknown> = { ...doc.location };
  delete location.addressLine;

  const precision = location.coordinatePrecision ?? 'approximate_500m';
  const coords = location.coordinates;

  if (precision === 'exact') {
    // Exact pins only where the seller permits (§6.4).
  } else if (precision === 'approximate_500m' && Array.isArray(coords)) {
    location.coordinates = jitterCoordinates(coords, doc.id, 500);
  } else {
    location.coordinates = null;
  }

  return { ...doc, location };
}
