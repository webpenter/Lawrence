import { NextResponse } from 'next/server';

import { brand } from '@/config/brand';
import { siteBase } from '@/lib/seo/sitemap';

export const revalidate = 3600;

// §14.6.1: a short Markdown map of the site for LLM agents.
export function GET(): NextResponse {
  const base = siteBase();
  const body = `# ${brand.name}

> ${brand.description}

## The admission rule

Every listing on this site has verified direct water access: at least one
qualifying water access type (private beach, private dock, direct shore,
mooring, boathouse, slipway, quay, rock platform, riparian access or whole
island) and a distance to the water of 50 metres or less. "Sea view" and
"walking distance to the beach" are rejected. Listings publish structured
water data: metres of private frontage, berth length, depth at berth, beam,
bridge clearance and whether open water is reachable.

## Key sections

- [Search](${base}/en/search): the full inventory with water and boat filters.
- [Destinations](${base}/en/markets): waterfront markets we cover.
- [Waterfront searches](${base}/sitemaps/landing.xml): curated landing pages, the indexable views of filtered inventory.
- [Journal](${base}/en/journal): editorial on mooring rules, tenure and waterfront ownership.
- [List with us](${base}/en/list-with-us): for agencies with qualifying inventory.

## Machine-readable data

- Listing JSON Schema: ${base}/schemas/listing.schema.json
- Aggregate statistics per landing combination: ${base}/api/public/stats/{combo}
- Sitemaps: ${base}/sitemap.xml

## Data licence and contact

Listing data belongs to the listing agencies and is provided for property
search. Quoting aggregates with attribution to ${brand.name} is welcome;
bulk reproduction of listings is not. Contact: ${brand.email.contact}.

A fuller index: ${base}/llms-full.txt
`;
  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600' },
  });
}
