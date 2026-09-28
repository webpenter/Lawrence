import { getPayload, type Payload, type Where } from 'payload';

import config from '@payload-config';
import type { Property } from '@/payload-types';
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

export interface ScopeAggregates {
  count: number;
  medianPriceEur: number | null;
  medianFrontageM: number | null;
  topPropertyType: string | null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 1 ? sorted[mid] : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  return value ?? null;
}

export async function getAggregatesForScope(scope: {
  country?: string;
  waterBodyType?: string;
  propertyType?: string;
  marketId?: number;
}): Promise<ScopeAggregates> {
  const payload = await getPayloadClient();
  const clauses: Where[] = [publicPredicate()];
  if (scope.country) clauses.push({ 'location.country': { equals: scope.country } });
  if (scope.waterBodyType)
    clauses.push({ 'waterfront.waterBodyType': { equals: scope.waterBodyType } });
  if (scope.propertyType) clauses.push({ propertyType: { equals: scope.propertyType } });
  if (scope.marketId != null)
    clauses.push({ 'location.market': { equals: scope.marketId } });

  const res = await payload.find({
    collection: 'properties',
    where: { and: clauses },
    limit: 1000,
    depth: 0,
    select: { priceEur: true, waterfront: true, propertyType: true },
  });

  const typeCounts = new Map<string, number>();
  for (const doc of res.docs) {
    if (doc.propertyType) {
      typeCounts.set(doc.propertyType, (typeCounts.get(doc.propertyType) ?? 0) + 1);
    }
  }
  const topPropertyType =
    [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    count: res.totalDocs,
    medianPriceEur: median(
      res.docs.map((d) => d.priceEur).filter((v): v is number => v != null),
    ),
    medianFrontageM: median(
      res.docs.map((d) => d.waterfront?.waterFrontageM).filter((v): v is number => v != null),
    ),
    topPropertyType,
  };
}

import type { LandingPage, Market } from '@/payload-types';
import { publishedLandingPagesWhere } from '@/lib/seo/combos';

export async function getLandingPageBySlug(
  slug: string,
  locale: Locale = 'en',
): Promise<LandingPage | null> {
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'landing-pages',
    where: { and: [publishedLandingPagesWhere(), { slug: { equals: slug } }] },
    locale,
    depth: 1,
    limit: 1,
    overrideAccess: true,
  });
  return res.docs[0] ?? null;
}

export async function getPublishedLandingPages(
  locale: Locale = 'en',
  limit = 100,
): Promise<LandingPage[]> {
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'landing-pages',
    where: publishedLandingPagesWhere(),
    locale,
    depth: 1,
    limit,
    overrideAccess: true,
  });
  return res.docs;
}

export async function getDestinationBySlug(
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

export interface MarketCount {
  id: number;
  name: string;
  slug: string;
  count: number;
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

export interface AgencyDashboardStats {
  listingsByStatus: Record<string, number>;
  expiringWithin14Days: number;
  leadsLast30Days: number;
}

export async function getAgencyDashboardStats(
  agencyId: number,
): Promise<AgencyDashboardStats> {
  const payload = await getPayloadClient();
  const statuses = ['draft', 'pending_review', 'in_market', 'under_offer', 'sold', 'expired'];

  const byStatus = await Promise.all(
    statuses.map(async (status) => {
      const { totalDocs } = await payload.count({
        collection: 'properties',
        where: { and: [{ agency: { equals: agencyId } }, { status: { equals: status } }] },
      });
      return [status, totalDocs] as const;
    }),
  );

  const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { totalDocs: expiringWithin14Days } = await payload.count({
    collection: 'properties',
    where: {
      and: [
        { agency: { equals: agencyId } },
        { status: { in: ['in_market', 'under_offer'] } },
        { expiresAt: { less_than_equal: in14Days } },
      ],
    },
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { totalDocs: leadsLast30Days } = await payload.count({
    collection: 'enquiries',
    where: {
      and: [{ agency: { equals: agencyId } }, { createdAt: { greater_than_equal: thirtyDaysAgo } }],
    },
  });

  return {
    listingsByStatus: Object.fromEntries(byStatus),
    expiringWithin14Days,
    leadsLast30Days,
  };
}
