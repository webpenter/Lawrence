import { NextResponse } from 'next/server';

import { brand } from '@/config/brand';
import { getGatedMarkets, getPublishedSegmentPages, getReports } from '@/lib/db';
import { segmentPagePassesGate } from '@/lib/seo/segments';
import { siteBase } from '@/lib/seo/sitemap';
import type { Market } from '@/payload-types';

export const revalidate = 3600;

// §15.6: the fuller /llms-full.txt — every market and report, plus the
// published segment pages.
export async function GET(): Promise<NextResponse> {
  const base = siteBase();

  let marketLines = '- (market index unavailable)';
  let segmentLines = '- (segment index unavailable)';
  let reportLines = '- (report index unavailable)';
  try {
    const markets = await getGatedMarkets('en', 500);
    if (markets.length > 0) {
      marketLines = markets
        .map(
          (market) =>
            `- [${market.name}](${base}/en/markets/${market.slug}) — stats: ${base}/api/public/markets/${market.slug}/stats`,
        )
        .join('\n');
    }

    const segments = await getPublishedSegmentPages('en', 500);
    const gated = segments.filter((page) => {
      const market = typeof page.market === 'object' ? (page.market as Market) : null;
      return (
        market != null &&
        !page.isSample &&
        !market.isSample &&
        segmentPagePassesGate(page, market)
      );
    });
    if (gated.length > 0) {
      segmentLines = gated
        .map((page) => {
          const market = page.market as Market;
          return `- [${page.title}](${base}/en/markets/${market.slug}/${page.segment})`;
        })
        .join('\n');
    }

    const reports = (await getReports('en', 100)).filter((report) => !report.isSample);
    if (reports.length > 0) {
      reportLines = reports
        .map((report) => `- [${report.title}](${base}/en/intelligence/${report.slug})`)
        .join('\n');
    }
  } catch {
    // Serve the static map regardless — an empty index beats a 500.
  }

  const body = `# ${brand.name} — full index

> ${brand.description}

Admission from €20,000,000 (a capped provenance exception runs €10–20M).
Market figures are published only with a source URL and an as-of date; the
same figures are served as JSON per market below.

## Markets

${marketLines}

## Segments

${segmentLines}

## Intelligence reports

${reportLines}

## Data endpoints

- Market statistics: ${base}/api/public/markets/{market}/stats (each figure with source and asOfDate)
- Sitemap index: ${base}/sitemap.xml

Contact: ${brand.email.contact}
`;
  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600' },
  });
}
