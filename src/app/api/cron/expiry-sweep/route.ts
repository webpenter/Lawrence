import { NextResponse, type NextRequest } from 'next/server';

import { getPayloadClient, getPublishedLandingPages } from '@/lib/db';
import { sendEmail } from '@/lib/email/send';
import {
  decideExpiryAction,
  REMINDER_WINDOW_DAYS,
  SOLD_RETIRE_AFTER_DAYS,
  soldPageShouldRetire,
} from '@/lib/expiry';
import { passesEditorialGate } from '@/lib/seo/combos';
import { deleteListingEverywhere } from '@/lib/search/sync';

export const maxDuration = 300;

// §8.7 expiry sweep: T-14 one-click confirmation reminders, then expiry —
// listing leaves search and sitemaps, and its URL serves 410 via the Redirect
// record the middleware consults. Stale inventory is the single biggest
// credibility killer in property portals.
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const payload = await getPayloadClient().catch(() => null);
  if (!payload) return NextResponse.json({ ok: false }, { status: 503 });

  const now = new Date();
  const horizon = new Date(
    now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const candidates = await payload.find({
    collection: 'properties',
    where: {
      and: [
        { status: { in: ['in_market', 'under_offer'] } },
        { expiresAt: { less_than_equal: horizon } },
      ],
    },
    limit: 500,
    depth: 1,
    overrideAccess: true,
  });

  let reminded = 0;
  let expired = 0;

  for (const listing of candidates.docs) {
    const action = decideExpiryAction(listing, now);

    if (action === 'expire') {
      await payload.update({
        collection: 'properties',
        id: listing.id,
        data: { status: 'expired' },
        overrideAccess: true,
      });
      await deleteListingEverywhere(String(listing.id));
      if (listing.slug) {
        // §14.5: 410 Gone removes the URL from indexes faster than a 404.
        const from = `/property/${listing.slug}`;
        const existing = await payload.find({
          collection: 'redirects',
          where: { from: { equals: from } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        });
        if (!existing.docs[0]) {
          await payload.create({
            collection: 'redirects',
            overrideAccess: true,
            data: { from, statusCode: '410' },
          });
        }
      }
      expired += 1;
    } else if (action === 'remind') {
      const agency = typeof listing.agency === 'object' ? listing.agency : null;
      if (agency?.email) {
        await sendEmail({
          to: agency.email,
          subject: 'WATERLINE: confirm your listings are still available',
          text: `"${listing.title}" expires on ${listing.expiresAt}. Confirm availability from your dashboard to keep it live for another 180 days.`,
        });
      }
      await payload.update({
        collection: 'properties',
        id: listing.id,
        data: { expiryReminderSentAt: now.toISOString() },
        overrideAccess: true,
        context: { viewBeacon: true },
      });
      reminded += 1;
    }
  }

  // §14.5: sold listings past the 90-day courtesy window retire — archived,
  // out of search, 301 to the parent landing page (or /search).
  let retired = 0;
  const soldSince = new Date(
    now.getTime() - SOLD_RETIRE_AFTER_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const soldCandidates = await payload.find({
    collection: 'properties',
    where: {
      and: [{ status: { equals: 'sold' } }, { updatedAt: { less_than_equal: soldSince } }],
    },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });
  const landingPages = soldCandidates.docs.length
    ? (await getPublishedLandingPages('en', 200).catch(() => [])).filter(passesEditorialGate)
    : [];

  for (const listing of soldCandidates.docs) {
    if (!soldPageShouldRetire(listing, now)) continue;
    const marketId =
      typeof listing.location?.market === 'object'
        ? listing.location.market?.id
        : listing.location?.market;
    const parent = landingPages.find((page) => {
      const combo = page.combo?.destination;
      return (typeof combo === 'object' ? combo?.id : combo) === marketId;
    });
    const to = parent ? `/waterfront/${parent.slug}` : '/search';

    await payload.update({
      collection: 'properties',
      id: listing.id,
      data: { status: 'archived' },
      overrideAccess: true,
    });
    await deleteListingEverywhere(String(listing.id));
    if (listing.slug) {
      const from = `/property/${listing.slug}`;
      const existing = await payload.find({
        collection: 'redirects',
        where: { from: { equals: from } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      if (!existing.docs[0]) {
        await payload.create({
          collection: 'redirects',
          overrideAccess: true,
          data: { from, to, statusCode: '301' },
        });
      }
    }
    retired += 1;
  }

  return NextResponse.json({ ok: true, scanned: candidates.totalDocs, reminded, expired, retired });
}
