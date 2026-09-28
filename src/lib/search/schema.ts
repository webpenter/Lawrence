import type { PropertyFilters } from '@/lib/db/filters';
import { PUBLICLY_VISIBLE_STATUSES } from '@/lib/db/filters';

/**
 * §7.1: two physically separate Typesense collections — the browser only ever
 * receives the public search-only key, so off-market inventory is separated by
 * infrastructure, not by a filter flag. Both are aliases; fullReindex swaps them
 * atomically.
 */
export const PUBLIC_LISTINGS_ALIAS = 'public_listings';
export const MEMBER_LISTINGS_ALIAS = 'member_listings';

export type SearchAudience = 'public' | 'member';

export function aliasFor(audience: SearchAudience): string {
  return audience === 'public' ? PUBLIC_LISTINGS_ALIAS : MEMBER_LISTINGS_ALIAS;
}

/**
 * One schema serves both collections: the member index holds off-market
 * listings with the same §8.3 member projection (exact price or band,
 * locality-level geography). Never internalValueEur, never an address.
 */
export const PROPERTY_SEARCH_SCHEMA = {
  fields: [
    { name: 'slug', type: 'string' as const, optional: true },
    { name: 'title', type: 'string' as const },
    { name: 'status', type: 'string' as const, facet: true },
    { name: 'isSample', type: 'bool' as const, facet: true },
    { name: 'valueTier', type: 'string' as const, facet: true, optional: true },
    { name: 'propertyType', type: 'string' as const, facet: true, optional: true },
    { name: 'priceDisclosure', type: 'string' as const, facet: true, optional: true },
    { name: 'priceEur', type: 'int64' as const, optional: true, facet: true },
    { name: 'priceBandMinEur', type: 'int64' as const, optional: true },
    { name: 'priceBandMaxEur', type: 'int64' as const, optional: true },
    { name: 'features', type: 'string[]' as const, facet: true, optional: true },
    { name: 'tenure', type: 'string' as const, facet: true, optional: true },
    { name: 'bedrooms', type: 'int32' as const, optional: true, facet: true },
    { name: 'bathrooms', type: 'int32' as const, optional: true },
    { name: 'builtAreaSqm', type: 'float' as const, optional: true },
    { name: 'plotAreaSqm', type: 'float' as const, optional: true },
    { name: 'waterAccess', type: 'bool' as const, facet: true, optional: true },
    { name: 'waterBodyType', type: 'string' as const, facet: true, optional: true },
    { name: 'waterFrontageM', type: 'float' as const, optional: true },
    { name: 'country', type: 'string' as const, facet: true, optional: true },
    // Display-only locality line for result rows ("Portofino · Liguria").
    { name: 'locality', type: 'string' as const, optional: true },
    { name: 'region', type: 'string' as const, optional: true },
    { name: 'marketId', type: 'int64' as const, facet: true, optional: true },
    { name: 'location', type: 'geopoint' as const, optional: true },
    { name: 'approximate', type: 'bool' as const, optional: true },
    { name: 'featured', type: 'bool' as const, optional: true },
    { name: 'publishedAtTs', type: 'int64' as const, optional: true },
  ],
  default_sorting_field: '',
};

function esc(value: string): string {
  return value.replace(/[`\\]/g, '');
}

function inClause(field: string, values: string[]): string {
  return `${field}:=[${values.map((v) => `\`${esc(v)}\``).join(',')}]`;
}

/** PropertyFilters → Typesense filter_by. Mirrors filtersToWhere exactly. */
export function filtersToTypesense(filters: PropertyFilters): string {
  const parts: string[] = [
    `status:=[${PUBLICLY_VISIBLE_STATUSES.map((s) => `\`${s}\``).join(',')}]`,
  ];
  if (process.env.SAMPLE_DATA_ENABLED !== 'true') parts.push('isSample:=false');

  if (filters.priceMinEur != null) parts.push(`priceEur:>=${filters.priceMinEur}`);
  if (filters.priceMaxEur != null) parts.push(`priceEur:<=${filters.priceMaxEur}`);

  if (filters.valueTiers?.length) parts.push(inClause('valueTier', filters.valueTiers));
  if (filters.propertyTypes?.length) parts.push(inClause('propertyType', filters.propertyTypes));
  if (filters.features?.length) parts.push(inClause('features', filters.features));
  if (filters.bedsMin != null) parts.push(`bedrooms:>=${filters.bedsMin}`);
  if (filters.bathsMin != null) parts.push(`bathrooms:>=${filters.bathsMin}`);
  if (filters.minBuiltSqm != null) parts.push(`builtAreaSqm:>=${filters.minBuiltSqm}`);
  if (filters.minPlotSqm != null) parts.push(`plotAreaSqm:>=${filters.minPlotSqm}`);
  if (filters.tenures?.length) parts.push(inClause('tenure', filters.tenures));

  if (filters.waterAccess) parts.push('waterAccess:=true');
  if (filters.waterBodyTypes?.length) parts.push(inClause('waterBodyType', filters.waterBodyTypes));
  if (filters.minFrontageM != null) parts.push(`waterFrontageM:>=${filters.minFrontageM}`);

  if (filters.country) parts.push(`country:=\`${esc(filters.country)}\``);
  if (filters.marketId != null) parts.push(`marketId:=${filters.marketId}`);
  if (filters.status) parts.push(`status:=\`${filters.status}\``);

  if (filters.bbox) {
    const { west, south, east, north } = filters.bbox;
    // Typesense polygon filter: lat,lng pairs.
    parts.push(
      `location:(${south},${west},${south},${east},${north},${east},${north},${west})`,
    );
  }

  return parts.join(' && ');
}

export function sortToTypesense(sort: PropertyFilters['sort']): string {
  switch (sort) {
    case 'price_asc':
      return 'priceEur:asc';
    case 'price_desc':
      return 'priceEur:desc';
    case 'newest':
    default:
      return 'publishedAtTs:desc';
  }
}

export const FACET_BY = [
  'valueTier',
  'propertyType',
  'priceDisclosure',
  'features',
  'tenure',
  'country',
  'bedrooms',
  'waterAccess',
  'waterBodyType',
].join(',');
