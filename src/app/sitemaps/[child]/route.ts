import { NextResponse } from 'next/server';

import {
  getPayloadClient,
  getPublishedLandingPages,
} from '@/lib/db';
import { passesEditorialGate } from '@/lib/seo/combos';
import { urlsetXml, type SitemapEntry } from '@/lib/seo/sitemap';

export const revalidate = 3600;

// §14 typed sitemap children. Exclusions are hard rules: samples are NEVER in
// a sitemap regardless of SAMPLE_DATA_ENABLED (§13.12), and only public,
// approved, published, live-status content appears. A missing database yields
// valid empty children rather than 500s.

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

async function landingEntries(): Promise<SitemapEntry[]> {
  const pages = await getPublishedLandingPages('en', 500);
  return pages
    .filter(passesEditorialGate)
    .map((page) => ({ path: `/waterfront/${page.slug}`, lastmod: page.updatedAt }));
}

async function destinationEntries(): Promise<SitemapEntry[]> {
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'destinations',
    limit: 500,
    depth: 0,
    select: { slug: true, updatedAt: true },
    overrideAccess: true,
  });
  return [
    { path: '/destinations' },
    ...res.docs.map((doc) => ({ path: `/destinations/${doc.slug}`, lastmod: doc.updatedAt })),
  ];
}

async function articleEntries(): Promise<SitemapEntry[]> {
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'articles',
    where: { _status: { equals: 'published' } },
    limit: 5000,
    depth: 0,
    select: { slug: true, updatedAt: true },
    overrideAccess: true,
  });
  return res.docs.map((doc) => ({ path: `/journal/${doc.slug}`, lastmod: doc.updatedAt }));
}

function staticEntries(): SitemapEntry[] {
  return [
    { path: '/' },
    { path: '/search' },
    { path: '/contact' },
    { path: '/list-with-us' },
    { path: '/journal' },
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
      case 'landing':
        entries = await landingEntries();
        break;
      case 'destinations':
        entries = await destinationEntries();
        break;
      case 'articles':
        entries = await articleEntries();
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
