import { getPayload, Payload } from 'payload';
import config from '@/payload.config';

import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import type { Viewer } from '@/lib/access/viewer';
import { getOffMarketListing, searchOffMarketListings } from '@/lib/db';
import { distanceMeters, type LngLat } from '@/lib/geo';
import { ensureSearchCollection } from '@/lib/search/client';
import { aliasFor } from '@/lib/search/schema';

// Prompt 6 acceptance: the member search path serves off-market inventory
// only to active members (member_listings collection + Postgres fallback),
// and exact coordinates never reach any search API surface.

let payload: Payload;
const suffix = Date.now().toString(36);
const EXACT: LngLat = [9.2099, 44.3034];

const ANON: Viewer = { kind: 'anonymous' };
const MEMBER: Viewer = { kind: 'member', id: '1', status: 'active' };
const PENDING: Viewer = { kind: 'member', id: '2', status: 'pending' };

let agencyId: number;
let offMarketId: number;

async function fetchSearchDoc(alias: string, id: number): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `http://${process.env.TYPESENSE_HOST ?? 'localhost'}:${process.env.TYPESENSE_PORT ?? '8108'}/collections/${alias}/documents/${id}`,
    { headers: { 'X-TYPESENSE-API-KEY': process.env.TYPESENSE_API_KEY ?? 'devkey' } },
  );
  return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
}

describe('Search layer (Prompt 6 acceptance)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config });
    await ensureSearchCollection('public');
    await ensureSearchCollection('member');

    const agency = await payload.create({
      collection: 'agencies',
      overrideAccess: true,
      data: { name: 'Search Test Agency', slug: `search-agency-${suffix}` },
    });
    agencyId = agency.id;

    const offMarket = await payload.create({
      collection: 'properties',
      overrideAccess: true,
      data: {
        title: `Search offmarket ${suffix}`,
        agency: agencyId,
        propertyType: 'villa',
        priceType: 'fixed',
        currency: 'EUR',
        priceAmount: 32_000_000,
        internalValueEur: 33_000_000,
        publication: 'off_market',
        channel: 'off_market',
        priceDisclosure: 'exact',
        status: 'available',
        moderation: 'unreviewed',
        sourceType: 'manual',
        location: {
          addressLine: `Secret Street ${suffix}`,
          locality: 'Portofino',
          region: 'Liguria',
          country: 'IT',
          coordinates: EXACT,
          coordinatePrecision: 'approximate_500m',
        },
        _status: 'published',
      },
    });
    offMarketId = offMarket.id;
  });

  afterAll(async () => {
    await payload.delete({
      collection: 'properties',
      where: { title: { like: `Search offmarket ${suffix}` } },
      overrideAccess: true,
    });
    await payload.delete({
      collection: 'agencies',
      where: { id: { equals: agencyId } },
      overrideAccess: true,
    });
  });

  it('routes the off-market listing into member_listings with jittered coordinates', async () => {
    const doc = await fetchSearchDoc(aliasFor('member'), offMarketId);
    expect(doc).not.toBeNull();
    expect(await fetchSearchDoc(aliasFor('public'), offMarketId)).toBeNull();

    const [lat, lng] = doc?.location as [number, number];
    expect([lng, lat]).not.toEqual(EXACT);
    const d = distanceMeters(EXACT, [lng, lat]);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(1100);
    expect(JSON.stringify(doc)).not.toContain('Secret Street');
    expect(JSON.stringify(doc)).not.toContain('33000000');
  });

  it('searchOffMarketListings: active members find it, everyone else gets an empty market', async () => {
    const asMember = await searchOffMarketListings(MEMBER, { country: 'IT' });
    expect(asMember.hits.some((h) => h.id === String(offMarketId))).toBe(true);

    for (const viewer of [ANON, PENDING]) {
      const result = await searchOffMarketListings(viewer, {});
      expect(result.total).toBe(0);
      expect(result.hits).toHaveLength(0);
    }
  });

  it('the Postgres fallback serves the member scope with the same predicate', async () => {
    const result = await searchOffMarketListings(
      MEMBER,
      { country: 'IT' },
      { healthy: async () => false },
    );
    expect(result.engine).toBe('postgres');
    const hit = result.hits.find((h) => h.id === String(offMarketId));
    expect(hit).toBeTruthy();
    // Fallback documents follow the same §8.3 discipline.
    expect(JSON.stringify(hit)).not.toContain('Secret Street');
    expect(JSON.stringify(hit)).not.toContain('33000000');
  });

  it('getOffMarketListing: members get the projected doc, anonymous gets null (404)', async () => {
    const asMember = await getOffMarketListing(MEMBER, offMarketId);
    expect(asMember?.title).toBe(`Search offmarket ${suffix}`);
    expect(asMember).not.toHaveProperty('internalValueEur');
    expect(JSON.stringify(asMember)).not.toContain('Secret Street');
    // Members get locality + circle — jittered, never the exact pin.
    expect(asMember?.location?.coordinates).not.toEqual(EXACT);

    expect(await getOffMarketListing(ANON, offMarketId)).toBeNull();
    expect(await getOffMarketListing(PENDING, offMarketId)).toBeNull();
  });
});
