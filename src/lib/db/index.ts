import { getPayload, type Payload, type Where } from 'payload';

import config from '@payload-config';
import type { Property, Report } from '@/payload-types';
import { isTypesenseHealthy, searchWithTypesense, type SearchResult } from '@/lib/search/client';
import { toSearchDocument } from '@/lib/search/document';

import { canSee } from '@/lib/access/can-see';
import { projectProperty } from '@/lib/access/projections';
import { isActiveMember, type Viewer } from '@/lib/access/viewer';

import {
  filtersToWhere,
  offMarketPredicate,
  publicPredicate,
  sortToPayload,
  type PropertyFilters,
  type SearchScope,
} from './filters';

// The ONLY place that touches the database (CLAUDE.md rule 2).
// Every listing-returning function takes an EXPLICIT Viewer (§8.1) and runs
// the §8.3 allowlist projection before anything leaves the data layer.
// The projected shape is a strict subset of Property, typed as Property for
// the render layer's convenience — fields outside the viewer's audience
// column simply do not exist on the returned object.

function projected(viewer: Viewer, doc: Property): Property {
  return projectProperty(viewer, doc as unknown as Record<string, unknown>) as unknown as Property;
}

export type Locale = 'en' | 'it' | 'fr' | 'de' | 'es' | 'ru';

let cached: Payload | null = null;
let inFlight: Promise<Payload> | null = null;
let lastFailureAt = 0;
const FAILURE_TTL_MS = 15_000;

/**
 * Cached Payload client. Concurrent callers share one connection attempt, and
 * after a failure every caller fails fast for FAILURE_TTL_MS instead of
 * re-dialing the database — one page render never stacks up N connect
 * timeouts when Postgres is down.
 */
export async function getPayloadClient(): Promise<Payload> {
  if (cached) return cached;
  if (Date.now() - lastFailureAt < FAILURE_TTL_MS) {
    throw new Error('Database unavailable (cooling down after a failed connection).');
  }
  if (!inFlight) {
    inFlight = (async () => {
      try {
        cached = await getPayload({ config: await config });
        return cached;
      } catch (err) {
        lastFailureAt = Date.now();
        throw err;
      } finally {
        inFlight = null;
      }
    })();
  }
  return inFlight;
}

export async function getPropertyBySlug(
  viewer: Viewer,
  slug: string,
  locale: Locale = 'en',
): Promise<Property | null> {
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'properties',
    where: { and: [publicPredicate(), { slug: { equals: slug } }] },
    locale,
    depth: 2,
    limit: 1,
  });
  const doc = res.docs[0];
  return doc ? projected(viewer, doc) : null;
}

/**
 * Detail-page fetch: unlike getPropertyBySlug, also returns sold/expired
 * listings so the page can render its designed states (§11.3). Off-market
 * listings have no slug and can never match; unpublished docs stay invisible.
 */
export async function getPropertyForDetail(
  viewer: Viewer,
  slug: string,
  locale: Locale = 'en',
): Promise<Property | null> {
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'properties',
    where: {
      and: [
        { slug: { equals: slug } },
        { _status: { equals: 'published' } },
        { channel: { equals: 'public' } },
        { moderation: { not_in: ['rejected', 'changes_requested'] } },
        { status: { in: ['available', 'reserved', 'under_offer', 'sold', 'expired'] } },
      ],
    },
    locale,
    depth: 2,
    limit: 1,
  });
  const doc = res.docs[0];
  return doc ? projected(viewer, doc) : null;
}

/** All public slugs, for generateStaticParams. Safe: empty when the DB is unreachable. */
export async function getPublicSlugs(limit = 500): Promise<string[]> {
  try {
    const payload = await getPayloadClient();
    const res = await payload.find({
      collection: 'properties',
      where: publicPredicate(),
      limit,
      depth: 0,
      select: { slug: true },
    });
    return res.docs.map((doc) => doc.slug).filter((slug): slug is string => Boolean(slug));
  } catch {
    return [];
  }
}

export async function getFeatured(
  viewer: Viewer,
  limit = 6,
  locale: Locale = 'en',
): Promise<Property[]> {
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'properties',
    where: { and: [publicPredicate(), { featured: { equals: true } }] },
    locale,
    depth: 1,
    limit,
    sort: '-publishedAt',
  });
  return res.docs.map((doc) => projected(viewer, doc));
}

export async function getSimilar(
  viewer: Viewer,
  property: Property,
  limit = 3,
  locale: Locale = 'en',
): Promise<Property[]> {
  const payload = await getPayloadClient();
  const clauses: Where[] = [publicPredicate(), { id: { not_equals: property.id } }];
  if (property.location?.market) {
    const marketId =
      typeof property.location.market === 'object'
        ? property.location.market.id
        : property.location.market;
    clauses.push({ 'location.market': { equals: marketId } });
  } else if (property.location?.country) {
    clauses.push({ 'location.country': { equals: property.location.country } });
  }
  if (property.priceEur != null) {
    clauses.push({ priceEur: { greater_than_equal: Math.round(property.priceEur * 0.5) } });
    clauses.push({ priceEur: { less_than_equal: Math.round(property.priceEur * 1.5) } });
  }
  const res = await payload.find({
    collection: 'properties',
    where: { and: clauses },
    locale,
    depth: 1,
    limit,
    sort: '-publishedAt',
  });
  return res.docs.map((doc) => projected(viewer, doc));
}

export interface SearchDeps {
  typesense?: (filters: PropertyFilters) => Promise<SearchResult>;
  postgres?: (filters: PropertyFilters) => Promise<SearchResult>;
  healthy?: () => Promise<boolean>;
}

/**
 * §5.3/§11.4 — the off-market detail fetch. Addressed by id (off-market
 * listings have no slug, by design); anything the viewer may not see is null,
 * which the route renders as 404 — never 403, never a hint (§8.6).
 */
export async function getOffMarketListing(
  viewer: Viewer,
  id: number | string,
  locale: Locale = 'en',
): Promise<Property | null> {
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'properties',
    where: { and: [offMarketPredicate(), { id: { equals: id } }] },
    locale,
    depth: 2,
    limit: 1,
  });
  const doc = res.docs[0];
  if (!doc) return null;
  if (!canSee(viewer, doc as unknown as Parameters<typeof canSee>[1])) return null;
  return projected(viewer, doc);
}

/**
 * §11.4 — the Off-Market index search. Server-side only, member Typesense
 * collection (the member key never reaches a browser); Postgres fallback
 * mirrors it. Anyone but an active member or staff gets an empty result —
 * indistinguishable from an empty market.
 */
export async function searchOffMarketListings(
  viewer: Viewer,
  filters: PropertyFilters,
  deps: SearchDeps = {},
): Promise<SearchResult> {
  if (viewer.kind !== 'staff' && !isActiveMember(viewer)) {
    return { hits: [], total: 0, page: filters.page ?? 1, facets: {}, engine: 'postgres' };
  }
  const engine = deps.typesense ?? ((f: PropertyFilters) => searchWithTypesense(f, 'member'));
  const fallback = deps.postgres ?? ((f: PropertyFilters) => searchListingsPostgres(f, 'off_market'));
  return searchWithFallback(filters, { ...deps, typesense: engine, postgres: fallback });
}

/**
 * Faceted search: Typesense when reachable, automatic Postgres fallback when
 * not (spec Prompt 5 acceptance: killing Typesense still returns results).
 */
export async function searchProperties(
  viewer: Viewer,
  filters: PropertyFilters,
  deps: SearchDeps = {},
): Promise<SearchResult> {
  void viewer; // public search serves the anonymous projection by design (§7.1)
  return searchWithFallback(filters, deps);
}

async function searchWithFallback(
  filters: PropertyFilters,
  deps: SearchDeps = {},
): Promise<SearchResult> {
  const healthy = deps.healthy ?? isTypesenseHealthy;
  const engine = deps.typesense ?? searchWithTypesense;
  const fallback = deps.postgres ?? searchPropertiesPostgres;

  if (await healthy()) {
    try {
      return await engine(filters);
    } catch (err) {
      console.warn('[search] Typesense failed mid-query; using Postgres fallback:', err);
    }
  }
  return fallback(filters);
}

export async function searchPropertiesPostgres(
  filters: PropertyFilters,
): Promise<SearchResult> {
  return searchListingsPostgres(filters, 'public');
}

/** The Postgres path behind both audiences — same predicate discipline as Typesense. */
async function searchListingsPostgres(
  filters: PropertyFilters,
  scope: SearchScope,
): Promise<SearchResult> {
  const payload = await getPayloadClient();
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 24, 100);
  const res = await payload.find({
    collection: 'properties',
    where: filtersToWhere(filters, scope),
    sort: sortToPayload(filters.sort),
    page,
    limit,
    depth: 1,
    locale: 'en',
  });
  return {
    hits: res.docs
      .map((doc) => toSearchDocument(doc) as SearchResult['hits'][number]),
    total: res.totalDocs,
    page,
    facets: {},
    engine: 'postgres',
  };
}

import type { Market, SegmentPage } from '@/payload-types';
import { marketPassesGate, type Segment } from '@/lib/seo/segments';

export async function getMarketBySlug(
  slug: string,
  locale: Locale = 'en',
): Promise<Market | null> {
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'markets',
    where: { slug: { equals: slug } },
    locale,
    depth: 1,
    limit: 1,
    overrideAccess: true,
  });
  return res.docs[0] ?? null;
}

/**
 * §5.5-gated markets: published editorial copy plus at least three sourced
 * data points. The only market set that enters sitemaps, llms.txt and the
 * research hub's stat rows.
 */
export async function getGatedMarkets(
  locale: Locale = 'en',
  limit = 100,
  includeSamples = false,
): Promise<Market[]> {
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'markets',
    ...(includeSamples ? {} : { where: { isSample: { not_equals: true } } }),
    locale,
    depth: 0,
    limit,
    overrideAccess: true,
  });
  return res.docs.filter(marketPassesGate);
}

export async function getPublishedSegmentPages(
  locale: Locale = 'en',
  limit = 200,
): Promise<SegmentPage[]> {
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'segment-pages',
    where: { _status: { equals: 'published' } },
    locale,
    depth: 1,
    limit,
    overrideAccess: true,
  });
  return res.docs;
}

export async function getSegmentPage(
  marketId: number,
  segment: Segment,
  locale: Locale = 'en',
): Promise<SegmentPage | null> {
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'segment-pages',
    where: {
      and: [
        { _status: { equals: 'published' } },
        { market: { equals: marketId } },
        { segment: { equals: segment } },
      ],
    },
    locale,
    depth: 1,
    limit: 1,
    overrideAccess: true,
  });
  return res.docs[0] ?? null;
}

/** §11.6 — published reports, newest first, ungated summaries included. */
export async function getReports(locale: Locale = 'en', limit = 20): Promise<Report[]> {
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'reports',
    where: { _status: { equals: 'published' } },
    sort: '-publicationDate',
    locale,
    depth: 1,
    limit,
    overrideAccess: true,
  });
  return res.docs;
}

export async function getReportBySlug(
  slug: string,
  locale: Locale = 'en',
): Promise<Report | null> {
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'reports',
    where: { and: [{ _status: { equals: 'published' } }, { slug: { equals: slug } }] },
    locale,
    depth: 1,
    limit: 1,
    overrideAccess: true,
  });
  return res.docs[0] ?? null;
}

export interface MarketCount {
  id: number;
  name: string;
  slug: string;
  count: number;
}

/**
 * §11.1 block 3 / §10.4 — the REAL live off-market count. The number itself
 * is deliberately public ("41 properties are held off-market"); the listings
 * are not. Never fails a page render: unknown counts read as zero.
 */
export async function countOffMarketListings(): Promise<number> {
  try {
    const payload = await getPayloadClient();
    const { totalDocs } = await payload.count({
      collection: 'properties',
      where: offMarketPredicate(),
      overrideAccess: true,
    });
    return totalDocs;
  } catch {
    return 0;
  }
}

/** §11.1 block 5 — the latest published report with its ungated summary. */
export async function getLatestReport(locale: Locale = 'en'): Promise<Report | null> {
  try {
    const payload = await getPayloadClient();
    const res = await payload.find({
      collection: 'reports',
      where: { _status: { equals: 'published' } },
      sort: '-publicationDate',
      locale,
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    return res.docs[0] ?? null;
  } catch {
    return null;
  }
}

export interface MarketTile {
  id: number;
  name: string;
  slug: string;
  count: number;
  /** §11.1 block 4: one live statistic with its asOfDate — or null when unsourced. */
  stat: { label: 'primeEntryEur' | 'medianPriceEurPerSqm'; value: number; asOfDate: string } | null;
}

/**
 * §11.1 block 4 — market tiles, each carrying one live statistic and its
 * asOfDate (§15.4 discipline: a number without a source and date does not
 * publish; tiles fall back to the listing count).
 */
export async function getMarketTiles(locale: Locale = 'en', limit = 8): Promise<MarketTile[]> {
  const counts = await getMarketCounts(locale);
  const payload = await getPayloadClient();
  const tiles: MarketTile[] = [];
  for (const market of counts.slice(0, limit)) {
    let stat: MarketTile['stat'] = null;
    try {
      const doc = await payload.findByID({
        collection: 'markets',
        id: market.id,
        depth: 0,
        locale,
        overrideAccess: true,
      });
      const stats = doc.stats;
      for (const label of ['primeEntryEur', 'medianPriceEurPerSqm'] as const) {
        const entry = stats?.[label];
        if (entry?.value != null && entry.source && entry.asOfDate) {
          stat = { label, value: entry.value, asOfDate: entry.asOfDate };
          break;
        }
      }
    } catch {
      // tile falls back to the count
    }
    tiles.push({ ...market, stat });
  }
  return tiles;
}

export async function getMarketCounts(locale: Locale = 'en'): Promise<MarketCount[]> {
  const payload = await getPayloadClient();
  const destinations = await payload.find({
    collection: 'markets',
    limit: 100,
    depth: 0,
    locale,
    overrideAccess: true,
  });

  const counts = await Promise.all(
    destinations.docs.map(async (destination) => {
      const { totalDocs } = await payload.count({
        collection: 'properties',
        where: {
          and: [publicPredicate(), { 'location.market': { equals: destination.id } }],
        },
      });
      return {
        id: destination.id,
        name: destination.name,
        slug: destination.slug,
        count: totalDocs,
      };
    }),
  );

  return counts.filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
}

