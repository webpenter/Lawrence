import { parseBool, type RawRow } from './validate-row';

/** Property `data` shape produced from one validated CSV/feed row. */
export type MappedListing = Record<string, unknown>;

const num = (v: string | undefined) => {
  const parsed = Number(v?.trim());
  return v?.trim() && Number.isFinite(parsed) ? parsed : undefined;
};
const text = (v: string | undefined) => (v?.trim() ? v.trim() : undefined);
const multi = (v: string | undefined) =>
  v
    ?.split('|')
    .map((p) => p.trim())
    .filter(Boolean) ?? [];

/**
 * Validated raw row → Property create/update data (§8.4). Import listings are
 * never trusted with lifecycle fields: status is forced to pending_review, the
 * hooks recompute slug/priceEur/fingerprint (status stays draft), and moderation stays unreviewed
 * unless the §8.6 auto-approve path clears it.
 */
export function mapRowToListing(raw: RawRow, agencyId: number): MappedListing {
  const value = (name: string) => raw[name];

  const listing: MappedListing = {
    agency: agencyId,
    sourceType: 'csv_import',
    status: 'draft',
    moderation: 'unreviewed',
    channel: 'public',
    reference: text(value('reference')),
    title: text(value('title_en')),
    propertyType: text(value('property_type')),
    priceType: text(value('price_type')) ?? 'fixed',
    priceAmount: num(value('price_amount')),
    priceBandMin: num(value('price_band_min')),
    priceBandMax: num(value('price_band_max')),
    internalValueEur: num(value('internal_value_eur')),
    currency: text(value('currency')) ?? 'EUR',
    tenure: text(value('tenure')),
    ownershipStructure: text(value('ownership_structure')),
    saleStructure: text(value('sale_structure')),
    bedrooms: num(value('bedrooms')),
    bathrooms: num(value('bathrooms')),
    builtAreaSqm: num(value('built_area_sqm')),
    plotAreaSqm: num(value('plot_area_sqm')),
    yearBuilt: num(value('year_built')),
    condition: text(value('condition')),
    heritageStatus: text(value('heritage_status')),
    architect: text(value('architect')),
    waterfront: {
      waterAccess: value('water_access') ? parseBool(value('water_access') as string) : undefined,
      waterBodyType: text(value('water_body_type')),
      waterFrontageM: num(value('water_frontage_m')),
      mooringType: text(value('mooring_type')),
      berthCount: num(value('berth_count')),
      maxBoatLoaM: num(value('max_boat_loa_m')),
    },
    videoUrl: text(value('video_url')),
    virtualTourUrl: text(value('virtual_tour_url')),
    location: {
      country: text(value('country'))?.toUpperCase(),
      region: text(value('region')),
      province: text(value('province')),
      locality: text(value('locality')),
      addressLine: text(value('address_line')),
      coordinates:
        num(value('longitude')) !== undefined && num(value('latitude')) !== undefined
          ? [num(value('longitude')), num(value('latitude'))]
          : undefined,
      coordinatePrecision: text(value('coordinate_precision')) ?? 'exact',
    },
    description: text(value('description_en'))
      ? {
          root: {
            type: 'root',
            format: '',
            indent: 0,
            version: 1,
            direction: 'ltr',
            children: [
              {
                type: 'paragraph',
                format: '',
                indent: 0,
                version: 1,
                direction: 'ltr',
                children: [{ type: 'text', version: 1, text: text(value('description_en')) }],
              },
            ],
          },
        }
      : undefined,
  };

  // Strip undefined so partial updates never blank existing values.
  for (const key of Object.keys(listing)) {
    if (listing[key] === undefined) delete listing[key];
  }
  const location = listing.location as Record<string, unknown>;
  for (const key of Object.keys(location)) {
    if (location[key] === undefined) delete location[key];
  }
  return listing;
}

/** Image URLs from a row, capped and deduplicated. */
export function imageUrlsFromRow(raw: RawRow, max = 30): string[] {
  return [...new Set(multi(raw.image_urls))].slice(0, max);
}
