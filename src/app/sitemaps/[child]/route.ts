import { NextResponse } from 'next/server';

import {
  getGatedMarkets,
  getPayloadClient,
  getPublishedSegmentPages,
  getReports,
} from '@/lib/db';
import { segmentPagePassesGate } from '@/lib/seo/segments';
import { urlsetXml, type SitemapEntry } from '@/lib/seo/sitemap';
import type { Market } from '@/payload-types';

export const revalidate = 3600;

// §15.2 typed sitemap children. Exclusions are hard rules: off-market,
// sample, expired and non-public content are NEVER in a sitemap (§15.2), and
// only §5.5-gated markets and segment pages appear. A missing database
// yields valid empty children rather than 500s.

async function propertyEntries(): Promise<SitemapEntry[]> {
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'properties',
    where: {
      and: [
        { _status: { equals: 'published' } },
        { moderation: { not_in: ['rejected', 'changes_requested'] } },
        { channel: { equals: 'public' } },
        { status: { in: ['available', 'reserved', 'under_offer'] } },
        { isSample: { not_equals: true } },
      ],
    },
    limit: 50_000,
    depth: 0,
    select: { slug: true, updatedAt: true },
    overrideAccess: true,
  });
  return res.docs
    .filter((doc) => doc.slug)
    .map((doc) => ({ path: `/property/${doc.slug}`, lastmod: doc.updatedAt }));
}

async function marketEntries(): Promise<SitemapEntry[]> {
  const markets = await getGatedMarkets('en', 500);
  return [
    { path: '/markets' },
    ...markets.map((market) => ({ path: `/markets/${market.slug}`, lastmod: market.updatedAt })),
  ];
}

async function segmentEntries(): Promise<SitemapEntry[]> {
  const pages = await getPublishedSegmentPages('en', 500);
  const entries: SitemapEntry[] = [];
  for (const page of pages) {
    const market = typeof page.market === 'object' ? (page.market as Market) : null;
    if (!market || page.isSample || market.isSample || !segmentPagePassesGate(page, market))
      continue;
    entries.push({ path: `/markets/${market.slug}/${page.segment}`, lastmod: page.updatedAt });
  }
  return entries;
}

async function reportEntries(): Promise<SitemapEntry[]> {
  const reports = (await getReports('en', 500)).filter((report) => !report.isSample);
  return [
    { path: '/intelligence' },
    ...reports.map((report) => ({
      path: `/intelligence/${report.slug}`,
      lastmod: report.updatedAt,
    })),
  ];
}

async function journalEntries(): Promise<SitemapEntry[]> {
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'articles',
    where: {
      and: [{ _status: { equals: 'published' } }, { isSample: { not_equals: true } }],
    },
    limit: 5000,
    depth: 0,
    select: { slug: true, updatedAt: true },
    overrideAccess: true,
  });
  return [
    { path: '/journal' },
    ...res.docs.map((doc) => ({ path: `/journal/${doc.slug}`, lastmod: doc.updatedAt })),
  ];
}

function staticEntries(): SitemapEntry[] {
  return [
    { path: '/' },
    { path: '/collection' },
    { path: '/contact' },
    { path: '/list-with-us' },
    { path: '/about' },
    { path: '/legal/privacy' },
    { path: '/legal/cookies' },
    { path: '/legal/terms' },
  ];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ child: string }> },
): Promise<NextResponse> {
  const { child } = await params;
  const name = child.replace(/\.xml$/, '');

  let entries: SitemapEntry[] = [];
  try {
    switch (name) {
      case 'static':
        entries = staticEntries();
        break;
      case 'properties':
        entries = await propertyEntries();
        break;
      case 'markets':
        entries = await marketEntries();
        break;
      case 'segments':
        entries = await segmentEntries();
        break;
      case 'reports':
        entries = await reportEntries();
        break;
      case 'journal':
        entries = await journalEntries();
        break;
      default:
        return new NextResponse('Not found', { status: 404 });
    }
  } catch (err) {
    console.warn(`[sitemap:${name}] data unavailable, serving empty child:`, err);
    entries = name === 'static' ? staticEntries() : [];
  }

  return new NextResponse(urlsetXml(entries), {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, s-maxage=3600' },
  });
}
