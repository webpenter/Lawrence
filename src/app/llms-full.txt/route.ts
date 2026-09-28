import { NextResponse } from 'next/server';

import { brand } from '@/config/brand';
import { getMarketCounts, getPublishedLandingPages } from '@/lib/db';
import { passesEditorialGate } from '@/lib/seo/combos';
import { siteBase } from '@/lib/seo/sitemap';

export const revalidate = 3600;

// §14.6.1: the fuller /llms-full.txt with the destination and landing index.
export async function GET(): Promise<NextResponse> {
  const base = siteBase();

  let destinationLines = '- (destination index unavailable)';
  let landingLines = '- (landing index unavailable)';
  try {
    const destinations = await getMarketCounts();
    if (destinations.length > 0) {
      destinationLines = destinations
        .map((d) => `- [${d.name}](${base}/en/markets/${d.slug}): ${d.count} listings`)
        .join('\n');
    }
    const landing = (await getPublishedLandingPages('en', 200)).filter(passesEditorialGate);
    if (landing.length > 0) {
      landingLines = landing
        .map((page) => `- [${page.title}](${base}/en/waterfront/${page.slug})`)
        .join('\n');
    }
  } catch {
    // Serve the static map regardless — an empty index beats a 500.
  }

  const body = `# ${brand.name} — full index

> ${brand.description}

Every listing carries verified direct water access (>=1 water access type,
distance to water <= 50 m) plus structured nautical data: frontage in metres,
maximum boat length, depth at berth, beam, bridge clearance, and open-water
navigability.

## Destinations

${destinationLines}

## Waterfront landing pages

${landingLines}

## Data endpoints

- Listing JSON Schema: ${base}/schemas/listing.schema.json
- Aggregates per combination: ${base}/api/public/stats/{combo} (counts and medians, with updatedAt)
- Sitemap index: ${base}/sitemap.xml

Contact: ${brand.email.contact}
`;
  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600' },
  });
}
