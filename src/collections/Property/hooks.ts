import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
} from 'payload';
import { ValidationError } from 'payload';

import { logAudit } from '@/lib/audit';
import { sendEmail } from '@/lib/email/send';
import { rankMatches } from '@/lib/match';
import { convertToEur, getDailyRatesPerEur } from '@/lib/fx';
import { computeFingerprint } from '@/lib/fingerprint';
import { revalidatePaths } from '@/lib/revalidate';
import { slugify } from '@/lib/slug';
import { toSearchDocument } from '@/lib/search/document';
import {
  deleteListingDocument,
  deleteListingEverywhere,
  upsertListingDocument,
} from '@/lib/search/sync';
import { isAgencyRole, relationId, staffUser } from '@/payload/access/tenant';

import type { Currency, ValueTier } from './enums';
import { LISTING_LIFETIME_DAYS } from './enums';
import { checkAdmission, checkPrimeCap } from './validation';

type PropertyData = Record<string, unknown>;

function merged(data: PropertyData | undefined, originalDoc: PropertyData | undefined) {
  return { ...(originalDoc ?? {}), ...(data ?? {}) } as PropertyData;
}

/**
 * §8.4 — "How should this property be published?" is the one required control;
 * channel and priceDisclosure derive from it so contradictory states cannot
 * exist. Off-market members see an exact price or a band (§8.3), never
 * "on request", so an off-market listing with on_request falls back to exact.
 */
export const applyPublicationControl: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  const doc = merged(data, originalDoc as PropertyData);
  const out: PropertyData = { ...data };

  switch (doc.publication) {
    case 'published_without_price':
      out.channel = 'public';
      out.priceDisclosure = 'on_request';
      break;
    case 'published_as_band':
      out.channel = 'public';
      out.priceDisclosure = 'band';
      break;
    case 'off_market': {
      out.channel = 'off_market';
      const disclosure = doc.priceDisclosure as string | undefined;
      out.priceDisclosure = disclosure === 'band' ? 'band' : 'exact';
      break;
    }
    case 'published_openly':
    default:
      out.channel = 'public';
      out.priceDisclosure = 'exact';
      break;
  }

  return out;
};

/**
 * §9.4 submission gate for agency roles (Track B seam), applied before
 * anything else:
 * - the listing is always owned by the submitter's own agency (and, for an
 *   agency_agent, routed to their own agent profile);
 * - `featured` and `moderation` are editorial-only — agency changes are dropped;
 * - agencies cannot publish directly: the attempt is saved as a draft with
 *   moderation reset to unreviewed for the review queue.
 */
export const sanitizeAgencySubmission: CollectionBeforeChangeHook = ({
  data,
  req,
  originalDoc,
}) => {
  const user = staffUser(req.user);
  if (!user || !isAgencyRole(user.role)) return data;

  const out: PropertyData = { ...data };
  const original = (originalDoc ?? {}) as PropertyData;

  out.agency = relationId(user.agency ?? null) ?? original.agency;
  if (user.role === 'agency_agent') {
    out.agent = relationId(user.agentProfile ?? null) ?? original.agent;
  }

  out.featured = original.featured ?? false;

  if (out._status === 'published') {
    out._status = 'draft';
    out.moderation = 'unreviewed';
  } else {
    out.moderation = original.moderation ?? 'unreviewed';
  }

  return out;
};

/**
 * The admission policy (spec §2.2). Publishing an inadmissible listing throws
 * a validation error with a human-readable reason; saving it as a draft is
 * allowed but writes the same reason into moderationNote so the submitter
 * sees exactly why it cannot go live. Enforcement uses internalValueEur when
 * present (mandatory for on-request pricing), else the public priceEur — both
 * already in EUR by the time validation runs? No: beforeValidate runs before
 * computeDerivedFields, so convert here from the raw amount when needed.
 */
export const enforceAdmission: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  const doc = merged(data, originalDoc as PropertyData);

  // Only a publish attempt is gated; drafts may hold anything.
  const publishing = doc._status === 'published';

  const rates = await getDailyRatesPerEur();
  const currency = (doc.currency as Currency | undefined) ?? 'EUR';
  const amount = doc.priceAmount as number | null | undefined;
  const priceEur = amount != null ? convertToEur(amount, currency, rates) : null;
  const internalValueEur = doc.internalValueEur as number | null | undefined;

  const admission = checkAdmission({
    internalValueEur,
    priceEur,
    valueTier: doc.valueTier as ValueTier | undefined,
  });

  if (admission.ok && admission.derivedTier === 'prime' && publishing) {
    // The 10% cap counts published listings excluding this one (§2.2).
    const [prime, total] = await Promise.all([
      req.payload.count({
        collection: 'properties',
        where: {
          and: [
            { _status: { equals: 'published' } },
            { valueTier: { equals: 'prime' } },
            { id: { not_equals: doc.id } },
          ],
        },
        overrideAccess: true,
      }),
      req.payload.count({
        collection: 'properties',
        where: {
          and: [{ _status: { equals: 'published' } }, { id: { not_equals: doc.id } }],
        },
        overrideAccess: true,
      }),
    ]);
    const cap = checkPrimeCap(prime.totalDocs, total.totalDocs);
    if (!cap.ok) {
      throw new ValidationError({
        collection: 'properties',
        errors: [{ message: cap.reason as string, path: 'valueTier' }],
      });
    }
  }

  if (admission.ok) {
    // trophy/signature always derive from value; prime survives only as the
    // explicit admin choice validated above.
    return { ...data, valueTier: admission.derivedTier };
  }

  if (publishing) {
    throw new ValidationError({
      collection: 'properties',
      errors: [
        { message: admission.reason as string, path: 'priceAmount' },
        { message: admission.reason as string, path: 'internalValueEur' },
      ],
    });
  }

  // Draft save: allowed, but surface the reason to the submitter.
  return { ...data, moderationNote: admission.reason };
};

export const computeDerivedFields: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  // View-counter updates touch nothing derived — skip the FX/slug/fingerprint work.
  if (req.context?.viewBeacon) return data;

  const doc = merged(data, originalDoc as PropertyData);
  const out: PropertyData = { ...data };

  // priceEur — the only field ever used for sorting and range filters (§6.2).
  // Band bounds convert with the same daily snapshot.
  const rates = await getDailyRatesPerEur();
  const currency = (doc.currency as Currency | undefined) ?? 'EUR';
  const amount = doc.priceAmount as number | null | undefined;
  out.priceEur = amount != null ? convertToEur(amount, currency, rates) : null;

  const bandMin = doc.priceBandMin as number | null | undefined;
  const bandMax = doc.priceBandMax as number | null | undefined;
  out.priceBandMinEur = bandMin != null ? convertToEur(bandMin, currency, rates) : null;
  out.priceBandMaxEur = bandMax != null ? convertToEur(bandMax, currency, rates) : null;

  // Slug rules (§6.1): public listings get a slug on first publish; off-market
  // listings NEVER have one — they are addressed by id, and a guessable slug
  // would itself be a leak. A deliberate admin edit on a public listing is
  // honoured; §15's 301 Redirect record is written in syncAfterChange.
  if (doc.channel === 'off_market') {
    out.slug = null;
  } else {
    const existingSlug = (originalDoc as PropertyData | undefined)?.slug as string | undefined;
    const incomingSlug = typeof data?.slug === 'string' ? data.slug.trim() : '';
    if (existingSlug && incomingSlug && incomingSlug !== existingSlug) {
      out.slug = slugify(incomingSlug);
    } else if (existingSlug) {
      out.slug = existingSlug;
    } else if (doc._status === 'published' && !doc.slug) {
      const location = doc.location as PropertyData | undefined;
      out.slug = slugify(
        typeof doc.title === 'string' ? doc.title : undefined,
        location?.locality as string | undefined,
        location?.region as string | undefined,
      );
    }
  }

  // Fingerprint for duplicate detection (§6.1). Point fields are [lng, lat].
  const location = doc.location as PropertyData | undefined;
  const coords = location?.coordinates as [number, number] | undefined;
  out.fingerprint = computeFingerprint({
    longitude: coords?.[0],
    latitude: coords?.[1],
    propertyType: doc.propertyType as string | null,
    builtAreaSqm: doc.builtAreaSqm as number | null,
    bedrooms: doc.bedrooms as number | null,
  });

  // publishedAt / expiresAt lifecycle (§9.3 — the 120-day freshness cycle).
  const wasPublished = Boolean((originalDoc as PropertyData | undefined)?.publishedAt);
  if (doc._status === 'published' && !wasPublished) {
    const publishedAt = new Date();
    out.publishedAt = publishedAt.toISOString();
    out.expiresAt = new Date(
      publishedAt.getTime() + LISTING_LIFETIME_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
  }

  return out;
};

const LIVE_STATUSES = ['available', 'reserved', 'under_offer'];

function isLive(doc: PropertyData): boolean {
  return (
    doc._status === 'published' &&
    LIVE_STATUSES.includes(doc.status as string) &&
    !['rejected', 'changes_requested'].includes(doc.moderation as string)
  );
}

/**
 * §7.1 routing — the single decision that keeps off-market inventory off every
 * public surface: a live public listing is upserted into public_listings and
 * deleted from member_listings; a live off-market listing is upserted into
 * member_listings and deleted from public_listings; anything not live is
 * deleted from both.
 */
export const syncAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  // View-counter increments are not content changes: no audit, no reindex.
  if (req.context?.viewBeacon) return doc;

  const d = doc as PropertyData;

  // §15: a slug change on a public listing creates an automatic 301 from the
  // old URL; the old slug is never reused.
  const previousSlug = (previousDoc as PropertyData | undefined)?.slug as string | undefined;
  if (previousSlug && typeof d.slug === 'string' && d.slug && d.slug !== previousSlug) {
    try {
      const from = `/property/${previousSlug}`;
      const existing = await req.payload.find({
        collection: 'redirects',
        where: { from: { equals: from } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      if (!existing.docs[0]) {
        await req.payload.create({
          collection: 'redirects',
          overrideAccess: true,
          data: { from, to: `/property/${d.slug}`, statusCode: '301' },
        });
      }
    } catch (err) {
      console.warn('[slug-redirect] failed to record 301:', err);
    }
  }

  const justPublished =
    d._status === 'published' && (previousDoc as PropertyData | undefined)?._status !== 'published';

  // §8.8: a newly published off-market listing notifies matching members —
  // one discreet email each. Never blocks the save.
  if (justPublished && d.channel === 'off_market' && !d.isSample) {
    void notifyMatchingMembers(req, d).catch((err) =>
      console.error('[match] notification failed:', err),
    );
  }

  await logAudit(
    req,
    justPublished ? 'publish' : operation === 'create' ? 'create' : 'update',
    'properties',
    String(d.id),
    `channel=${d.channel} status=${d.status}`,
  );

  if (!isLive(d)) {
    await deleteListingEverywhere(String(d.id));
  } else if (d.channel === 'off_market') {
    await upsertListingDocument('member', toSearchDocument(d));
    await deleteListingDocument('public', String(d.id));
  } else {
    await upsertListingDocument('public', toSearchDocument(d));
    await deleteListingDocument('member', String(d.id));
  }

  // Off-market pages are dynamic and never cached (§5.3) — only public
  // surfaces revalidate.
  const paths = ['/'];
  if (d.channel !== 'off_market' && typeof d.slug === 'string' && d.slug)
    paths.push(`/property/${d.slug}`);
  await revalidatePaths(paths);

  return doc;
};

async function notifyMatchingMembers(
  req: Parameters<CollectionAfterChangeHook>[0]['req'],
  listing: PropertyData,
): Promise<void> {
  const requirements = await req.payload.find({
    collection: 'requirements',
    where: { and: [{ status: { equals: 'active' } }, { notifyByEmail: { equals: true } }] },
    limit: 1000,
    depth: 1,
    overrideAccess: true,
  });
  const matches = rankMatches(
    requirements.docs,
    listing as unknown as Parameters<typeof rankMatches>[1],
  );
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  for (const match of matches) {
    const member =
      typeof match.requirement.member === 'object' ? match.requirement.member : null;
    if (!member?.email || member.status !== 'active') continue;
    const locale = member.preferredLocale ?? 'en';
    const url = `${base}/${locale}/off-market/${listing.id}`;
    await sendEmail({
      to: member.email,
      // §12.3 match email subject, verbatim.
      subject: 'A property matching your requirements has arrived',
      text: `A property matching your requirements has arrived. View it (account required): ${url}`,
      html: `<p>A property matching your requirements has arrived.</p><p><a href="${url}">${url}</a></p>`,
    }).catch((err) => console.error('[match] email failed:', err));
    await req.payload.create({
      collection: 'member-activity',
      data: {
        member: member.id,
        property: listing.id as number,
        action: 'off_market_list',
        at: new Date().toISOString(),
      },
      overrideAccess: true,
    });
  }
}

export const cleanupAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const d = doc as PropertyData;
  await logAudit(req, 'delete', 'properties', String(d.id), String(d.slug ?? d.id));
  await deleteListingEverywhere(String(d.id));
  const paths = ['/'];
  if (typeof d.slug === 'string' && d.slug) paths.push(`/property/${d.slug}`);
  await revalidatePaths(paths);
};
