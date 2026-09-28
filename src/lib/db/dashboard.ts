import {
  averageResponseHours,
  classifyAttention,
  leadsPerWeek,
  type AttentionReason,
  type WeekBucket,
} from '@/lib/dashboard/metrics';
import type { Property } from '@/payload-types';

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
  totalsByStatus: Record<string, number>;
  totalsByWaterBody: Array<{ value: string; count: number }>;
  dataQuality: { missingFrontage: number; missingNautical: number };
  topByViews: Array<{ id: number; title: string; viewCount: number }>;
  leadsWeekly: WeekBucket[];
  agencyLeaderboard: Array<{ id: number; name: string; listings: number; leads: number }>;
  sampleLeak: boolean;
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const payload = await getPayloadClient();
  const now = new Date();

  const totalsByStatus = Object.fromEntries(
    await Promise.all(
      STATUSES.map(async (status) => {
        const { totalDocs } = await payload.count({
          collection: 'properties',
          where: { status: { equals: status } },
          overrideAccess: true,
        });
        return [status, totalDocs] as const;
      }),
    ),
  );

  const waterBodies = ['sea', 'ocean', 'lake', 'river', 'canal', 'lagoon', 'fjord', 'marina_basin'];
  const totalsByWaterBody = (
    await Promise.all(
      waterBodies.map(async (value) => {
        const { totalDocs } = await payload.count({
          collection: 'properties',
          where: { waterBodyType: { equals: value } },
          overrideAccess: true,
        });
        return { value, count: totalDocs };
      }),
    )
  ).filter((entry) => entry.count > 0);

  const [missingFrontage, missingNautical] = await Promise.all([
    // §9.2 data-quality panel: live listings without a market assignment.
    payload.count({
      collection: 'properties',
      where: {
        and: [
          { status: { in: ['available', 'reserved', 'under_offer'] } },
          { 'location.market': { equals: null } },
        ],
      },
      overrideAccess: true,
    }),
    // Live listings without an enforceable value (no price and no internal value).
    payload.count({
      collection: 'properties',
      where: {
        and: [
          { status: { in: ['available', 'reserved', 'under_offer'] } },
          { priceEur: { equals: null } },
          { internalValueEur: { equals: null } },
        ],
      },
      overrideAccess: true,
    }),
  ]);

  const top = await payload.find({
    collection: 'properties',
    sort: '-viewCount',
    limit: 10,
    depth: 0,
    select: { title: true, viewCount: true },
    overrideAccess: true,
  });

  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 3600_000).toISOString();
  const recentLeads = await payload.find({
    collection: 'enquiries',
    where: { createdAt: { greater_than_equal: eightWeeksAgo } },
    limit: 1000,
    depth: 0,
    select: { createdAt: true, updatedAt: true, status: true, source: true },
    overrideAccess: true,
  });

  const agencies = await payload.find({
    collection: 'agencies',
    limit: 50,
    depth: 0,
    select: { name: true },
    overrideAccess: true,
  });
  const agencyLeaderboard = (
    await Promise.all(
      agencies.docs.map(async (agency) => {
        const [{ totalDocs: listings }, { totalDocs: leadCount }] = await Promise.all([
          payload.count({
            collection: 'properties',
            where: { agency: { equals: agency.id } },
            overrideAccess: true,
          }),
          payload.count({
            collection: 'enquiries',
            where: { agency: { equals: agency.id } },
            overrideAccess: true,
          }),
        ]);
        return { id: agency.id, name: agency.name, listings, leads: leadCount };
      }),
    )
  )
    .sort((a, b) => b.leads - a.leads || b.listings - a.listings)
    .slice(0, 10);

  // §13.12 launch gate: a sample listing publicly live while demo mode is OFF
  // is a leak the dashboard must shout about.
  let sampleLeak = false;
  if (process.env.SAMPLE_DATA_ENABLED !== 'true') {
    const { totalDocs } = await payload.count({
      collection: 'properties',
      where: {
        and: [
          { isSample: { equals: true } },
          { status: { in: ['available', 'reserved', 'under_offer'] } },
          { channel: { equals: 'public' } },
        ],
      },
      overrideAccess: true,
    });
    sampleLeak = totalDocs > 0;
  }

  return {
    totalsByStatus,
    totalsByWaterBody,
    dataQuality: {
      missingFrontage: missingFrontage.totalDocs,
      missingNautical: missingNautical.totalDocs,
    },
    topByViews: top.docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      viewCount: doc.viewCount ?? 0,
    })),
    leadsWeekly: leadsPerWeek(recentLeads.docs, now),
    agencyLeaderboard,
    sampleLeak,
  };
}

export type { Property };
