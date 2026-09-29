import { NextResponse } from 'next/server';

import { sitemapIndexXml } from '@/lib/seo/sitemap';

export const revalidate = 3600;

// §15.2: sitemap index; children are split by content type — properties,
// markets, segments, reports, journal, static.
export function GET(): NextResponse {
  const xml = sitemapIndexXml([
    { name: 'static' },
    { name: 'properties' },
    { name: 'markets' },
    { name: 'segments' },
    { name: 'reports' },
    { name: 'journal' },
  ]);
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=3600' },
  });
}
