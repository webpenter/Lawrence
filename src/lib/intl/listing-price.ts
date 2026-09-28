import type { Property } from '@/payload-types';

/**
 * §12.2 price line: exact, or "Guide €{min}–{max} M", or "Price on request".
 * Sold listings NEVER show a price (§11.3 states). Works on projected docs —
 * the projection already stripped whatever the disclosure forbids, so this
 * helper only decides presentation.
 */
export type ListingPrice =
  | { kind: 'exact'; priceEur: number }
  | { kind: 'band'; minM: number; maxM: number }
  | { kind: 'none' };

export function listingPrice(
  property: Pick<Property, 'status' | 'priceDisclosure' | 'priceEur' | 'priceBandMinEur' | 'priceBandMaxEur'>,
): ListingPrice {
  if (property.status === 'sold') return { kind: 'none' };
  if (property.priceDisclosure === 'exact' && property.priceEur != null) {
    return { kind: 'exact', priceEur: property.priceEur };
  }
  if (
    property.priceDisclosure === 'band' &&
    (property.priceBandMinEur != null || property.priceBandMaxEur != null)
  ) {
    const toM = (v: number | null | undefined) => Math.round(((v ?? 0) / 1_000_000) * 10) / 10;
    return {
      kind: 'band',
      minM: toM(property.priceBandMinEur ?? property.priceBandMaxEur),
      maxM: toM(property.priceBandMaxEur ?? property.priceBandMinEur),
    };
  }
  return { kind: 'none' };
}
