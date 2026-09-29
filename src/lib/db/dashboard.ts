import {
  averageResponseHours,
  classifyAttention,
  leadsPerWeek,
  type AttentionReason,
  type WeekBucket,
} from '@/lib/dashboard/metrics';
import { matchRequirement } from '@/lib/match';
import type { Property, Requirement } from '@/payload-types';

import { getPayloadClient } from './index';

/**
 * Read-only dashboard queries (Prompt 15: all queries via /src/lib/db).
 * Everything is bounded (counts + small finds) so the pages stay under the
 * one-second load target at 1000 listings.
 */

export interface AgencyDashboard {
  listingsByStatus: Record<string, number>;
  attention: Array<{ id: number; title: string; reasons: AttentionReason[] }>;
  topListings: Array<{ id: number; title: string; viewCount: number; leadCount: number }>;
  leadsLast30Days: number;
  averageResponseHours: number | null;
  feed: { feedUrl?: string | null; feedLastRunAt?: string | null; feedLastStatus?: string | null } | null;
}

const STATUSES = ['draft', 'available', 'reserved', 'under_offer', 'sold', 'expired', 'withdrawn'];

export async function getAgencyDashboard(agencyId: number): Promise<AgencyDashboard> {
  const payload = await getPayloadClient();
  const now = new Date();

  const byStatus = await Promise.all(
    STATUSES.map(async (status) => {
      const { totalDocs } = await payload.count({
        collection: 'properties',
        where: { and: [{ agency: { equals: agencyId } }, { status: { equals: status } }] },
        overrideAccess: true,
      });
      return [status, totalDocs] as const;
    }),
  );

  const candidates = await payload.find({
    collection: 'properties',
    where: {
      and: [
        { agency: { equals: agencyId } },
        { status: { in: ['available', 'reserved', 'under_offer', 'draft'] } },
      ],
    },
    limit: 200,
    depth: 0,
    select: {
      title: true,
      status: true,
      moderation: true,
      expiresAt: true,
      viewCount: true,
      enquiryCount: true,
      location: true,
      priceEur: true,
      internalValueEur: true,
    },
    overrideAccess: true,
  });

  const attention = candidates.docs
    .map((listing) => ({
      id: listing.id,
      title: listing.title,
      reasons: classifyAttention(
        {
          ...listing,
          marketId:
            typeof listing.location?.market === 'object'
              ? (listing.location?.market?.id ?? null)
              : (listing.location?.market ?? null),
          hasValue: listing.priceEur != null || listing.internalValueEur != null,
        },
        now,
      ),
    }))
    .filter((entry) => entry.reasons.length > 0)
    .slice(0, 12);

  const topListings = [...candidates.docs]
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, 10)
    .map((listing) => ({
      id: listing.id,
      title: listing.title,
      viewCount: listing.viewCount ?? 0,
      leadCount: listing.enquiryCount ?? 0,
    }));

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600_000).toISOString();
  const leads = await payload.find({
    collection: 'enquiries',
    where: {
      and: [{ agency: { equals: agencyId } }, { createdAt: { greater_than_equal: thirtyDaysAgo } }],
    },
    limit: 500,
    depth: 0,
    select: { createdAt: true, updatedAt: true, status: true, source: true },
    overrideAccess: true,
  });

  const agency = await payload.findByID({
    collection: 'agencies',
    id: agencyId,
    depth: 0,
    overrideAccess: true,
  });

  return {
    listingsByStatus: Object.fromEntries(byStatus),
    attention,
    topListings,
    leadsLast30Days: leads.totalDocs,
    averageResponseHours: averageResponseHours(leads.docs),
    feed: agency.feed ?? null,
  };
}

export interface AdminDashboard {
  /** §9.2 inventory: live listings bucketed four ways. */
  inventory: {
    byChannel: Record<string, number>;
    byStatus: Record<string, number>;
    byValueTier: Record<string, number>;
    byMarket: Array<{ name: string; count: number }>;
  };
  /** §9.2 members over time (weekly, 8 weeks) with source breakdown. */
  members: {
    total: number;
    confirmed: number;
    weekly: Array<{ weekOf: string; total: number }>;
    bySource: Record<string, number>;
  };
  /** §9.2 off-market demand: views and document downloads per listing. */
  offMarketDemand: Array<{ id: number; title: string; views: number; downloads: number }>;
  /** §9.2 enquiries per week by source, with the response-status split. */
  enquiries: {
    weekly: WeekBucket[];
    byResponseStatus: Record<string, number>;
    averageResponseHours: number | null;
  };
  /** §9.2 requirements board: active requirements with live match counts. */
  requirementsBoard: Array<{
    id: number;
    memberEmail: string;
    budget: string;
    matches: number;
  }>;
  /** §9.2 data quality: missing images, short descriptions, missing market, expiring soon. */
  dataQuality: {
    missingImages: number;
    shortDescriptions: number;
    missingMarket: number;
    expiringSoon: number;
  };
  sampleLeak: boolean;
}

const LIVE_STATUSES = ['available', 'reserved', 'under_offer'];

function bump(record: Record<string, number>, key: string | null | undefined): void {
  const k = key ?? 'unknown';
  record[k] = (record[k] ?? 0) + 1;
}

function plainTextLength(value: unknown): number {
  if (!value) return 0;
  const matches = JSON.stringify(value).match(/"text":"([^"]*)"/g) ?? [];
  return matches.reduce((sum, entry) => sum + entry.length - 9, 0);
}

/**
 * §9.2 admin dashboard in SEVEN bounded queries — one pass over listings,
 * members, activity, enquiries, requirements and markets each, then pure
 * in-memory bucketing. That is what keeps the page under the one-second
 * target with the sample dataset.
 */
export async function getAdminDashboard(): Promise<AdminDashboard> {
  const payload = await getPayloadClient();
  const now = new Date();
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 3600_000).toISOString();
  const fourteenDaysAhead = new Date(now.getTime() + 14 * 24 * 3600_000).toISOString();

  const [properties, markets, members, activity, recentEnquiries, requirements] =
    await Promise.all([
      payload.find({
        collection: 'properties',
        limit: 2000,
        depth: 0,
        select: {
          title: true,
          status: true,
          channel: true,
          valueTier: true,
          isSample: true,
          location: true,
          media: true,
          description: true,
          expiresAt: true,
          priceEur: true,
          priceBandMinEur: true,
          priceBandMaxEur: true,
          propertyType: true,
          features: true,
        },
        overrideAccess: true,
      }),
      payload.find({
        collection: 'markets',
        limit: 200,
        depth: 0,
        select: { name: true },
        overrideAccess: true,
      }),
      payload.find({
        collection: 'members',
        limit: 5000,
        depth: 0,
        select: { createdAt: true, source: true, emailVerifiedAt: true },
        overrideAccess: true,
      }),
      payload.find({
        collection: 'member-activity',
        where: { action: { in: ['off_market_view', 'document_download'] } },
        limit: 5000,
        depth: 0,
        select: { action: true, property: true },
        overrideAccess: true,
      }),
      payload.find({
        collection: 'enquiries',
        where: { createdAt: { greater_than_equal: eightWeeksAgo } },
        limit: 1000,
        depth: 0,
        select: { createdAt: true, updatedAt: true, status: true, source: true },
        overrideAccess: true,
      }),
      payload.find({
        collection: 'requirements',
        where: { status: { equals: 'active' } },
        limit: 100,
        depth: 1,
        overrideAccess: true,
      }),
    ]);

  const marketNames = new Map(markets.docs.map((market) => [market.id, market.name]));

  // One pass over the inventory.
  const byChannel: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byValueTier: Record<string, number> = {};
  const byMarketCount = new Map<number, number>();
  const titles = new Map<number, string>();
  let missingImages = 0;
  let shortDescriptions = 0;
  let missingMarket = 0;
  let expiringSoon = 0;
  let sampleLive = 0;
  const offMarketListings: Property[] = [];

  for (const doc of properties.docs) {
    titles.set(doc.id, doc.title);
    const live = LIVE_STATUSES.includes(doc.status);
    if (live) {
      bump(byChannel, doc.channel);
      bump(byValueTier, doc.valueTier);
      const marketId =
        typeof doc.location?.market === 'object'
          ? doc.location?.market?.id
          : doc.location?.market;
      if (marketId != null) {
        byMarketCount.set(marketId, (byMarketCount.get(marketId) ?? 0) + 1);
      } else {
        missingMarket += 1;
      }
      if (!doc.media || doc.media.length === 0) missingImages += 1;
      if (plainTextLength(doc.description) < 300) shortDescriptions += 1;
      if (doc.expiresAt && doc.expiresAt <= fourteenDaysAhead) expiringSoon += 1;
      if (doc.isSample && doc.channel === 'public') sampleLive += 1;
      if (doc.channel === 'off_market') offMarketListings.push(doc as Property);
    }
    bump(byStatus, doc.status);
  }

  const byMarket = [...byMarketCount.entries()]
    .map(([id, count]) => ({ name: marketNames.get(id) ?? String(id), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // Members over time + source breakdown (§9.2 funnel).
  const weeklyMembers = new Map<string, number>();
  for (let i = 7; i >= 0; i -= 1) {
    const week = new Date(now.getTime() - i * 7 * 24 * 3600_000);
    const monday = new Date(
      Date.UTC(week.getUTCFullYear(), week.getUTCMonth(), week.getUTCDate()),
    );
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    weeklyMembers.set(monday.toISOString().slice(0, 10), 0);
  }
  const memberSources: Record<string, number> = {};
  let confirmed = 0;
  for (const member of members.docs) {
    bump(memberSources, member.source);
    if (member.emailVerifiedAt) confirmed += 1;
    const created = new Date(member.createdAt);
    if (!Number.isNaN(created.getTime())) {
      const monday = new Date(
        Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate()),
      );
      monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      if (weeklyMembers.has(key)) weeklyMembers.set(key, (weeklyMembers.get(key) ?? 0) + 1);
    }
  }

  // Off-market demand per listing (§9.2): views and document downloads.
  const demand = new Map<number, { views: number; downloads: number }>();
  for (const row of activity.docs) {
    const propertyId = typeof row.property === 'object' ? row.property?.id : row.property;
    if (propertyId == null) continue;
    const entry = demand.get(propertyId) ?? { views: 0, downloads: 0 };
    if (row.action === 'off_market_view') entry.views += 1;
    else entry.downloads += 1;
    demand.set(propertyId, entry);
  }
  const offMarketDemand = [...demand.entries()]
    .map(([id, counts]) => ({ id, title: titles.get(id) ?? `#${id}`, ...counts }))
    .sort((a, b) => b.views + b.downloads - (a.views + a.downloads))
    .slice(0, 10);

  // Enquiries per week by source with the response-status split.
  const byResponseStatus: Record<string, number> = {};
  for (const enquiry of recentEnquiries.docs) {
    bump(byResponseStatus, enquiry.status);
  }

  // Requirements board with live match counts against off-market inventory.
  const requirementsBoard = requirements.docs.slice(0, 20).map((requirement) => {
    const doc = requirement as Requirement;
    const matches = offMarketListings.filter(
      (listing) => matchRequirement(doc, listing).matches,
    ).length;
    const memberEmail =
      typeof doc.member === 'object' && doc.member !== null
        ? ((doc.member as { email?: string }).email ?? `#${doc.member.id}`)
        : `#${String(doc.member)}`;
    const min = doc.budgetMinEur != null ? `${Math.round(doc.budgetMinEur / 1_000_000)}M` : null;
    const max = doc.budgetMaxEur != null ? `${Math.round(doc.budgetMaxEur / 1_000_000)}M` : null;
    const budget = min && max ? `${min}\u2013${max}` : (min ?? max ?? '\u2014');
    return { id: doc.id, memberEmail, budget, matches };
  });

  // §13.12 launch gate: a sample listing publicly live while demo mode is OFF
  // is a leak the dashboard must shout about.
  const sampleLeak = process.env.SAMPLE_DATA_ENABLED !== 'true' && sampleLive > 0;

  return {
    inventory: { byChannel, byStatus, byValueTier, byMarket },
    members: {
      total: members.totalDocs,
      confirmed,
      weekly: [...weeklyMembers.entries()].map(([weekOf, total]) => ({ weekOf, total })),
      bySource: memberSources,
    },
    offMarketDemand,
    enquiries: {
      weekly: leadsPerWeek(recentEnquiries.docs, now),
      byResponseStatus,
      averageResponseHours: averageResponseHours(recentEnquiries.docs),
    },
    requirementsBoard,
    dataQuality: { missingImages, shortDescriptions, missingMarket, expiringSoon },
    sampleLeak,
  };
}

export type { Property };
