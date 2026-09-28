import { getPayload, Payload } from 'payload';
import config from '@/payload.config';

import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import { ensureSearchCollection } from '@/lib/search/client';
import { aliasFor, type SearchAudience } from '@/lib/search/schema';

// Prompt 3 acceptance criteria, proven against a real Postgres+PostGIS database
// and a real Typesense node: the €20M admission gate, valueTier derivation,
// off-market slug rules, and §7.1 channel → collection routing.

let payload: Payload;
let agencyId: number;

async function findSearchDoc(
  audience: SearchAudience,
  id: string | number,
): Promise<Record<string, unknown> | null> {
  const protocol = process.env.TYPESENSE_PROTOCOL ?? 'http';
  const host = process.env.TYPESENSE_HOST ?? 'localhost';
  const port = process.env.TYPESENSE_PORT ?? '8108';
  const res = await fetch(
    `${protocol}://${host}:${port}/collections/${aliasFor(audience)}/documents/${id}`,
    { headers: { 'X-TYPESENSE-API-KEY': process.env.TYPESENSE_API_KEY ?? 'devkey' } },
  );
  if (!res.ok) return null;
  return (await res.json()) as Record<string, unknown>;
}

/**
 * Payload surfaces beforeValidate rejections as a generic "fields are invalid"
 * message with the human reason nested in err.data.errors — assert on both.
 */
async function expectPublishBlocked(promise: Promise<unknown>, reason: RegExp): Promise<void> {
  try {
    await promise;
  } catch (err) {
    const detail = JSON.stringify((err as { data?: unknown }).data ?? {});
    expect(`${(err as Error).message} ${detail}`).toMatch(reason);
    return;
  }
  throw new Error(`expected publish to be blocked by ${reason}`);
}

describe('Property collection (Prompt 3 acceptance)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config });
    await ensureSearchCollection('public');
    await ensureSearchCollection('member');
    // Stale rows from earlier failed runs would skew the prime-cap count.
    await payload.delete({
      collection: 'properties',
      where: { reference: { like: 'INT-TEST-%' } },
      overrideAccess: true,
    });
    const agency = await payload.create({
      collection: 'agencies',
      data: { name: 'Test Agency', slug: `test-agency-${Date.now()}` },
    });
    agencyId = agency.id;
  });

  afterAll(async () => {
    await payload.delete({
      collection: 'properties',
      where: { reference: { like: 'INT-TEST-%' } },
      overrideAccess: true,
    });
    await payload.delete({ collection: 'agencies', where: { id: { equals: agencyId } } });
  });

  const validBase = () => {
    const reference = `INT-TEST-${Math.random().toString(36).slice(2)}`;
    return {
      // Unique per test: the slug derives from the title and is unique.
      title: `Integration test palazzo ${reference.slice(-6)}`,
      reference,
    agency: agencyId,
    propertyType: 'palazzo' as const,
    priceType: 'fixed' as const,
    currency: 'EUR' as const,
      publication: 'published_openly' as const,
      // channel/priceDisclosure are derived from publication by the hook; the
      // generated create type still requires them because they are required fields.
      channel: 'public' as const,
      priceDisclosure: 'exact' as const,
      status: 'available' as const,
      moderation: 'unreviewed' as const,
      sourceType: 'manual' as const,
    };
  };

  it('blocks publishing below €20M without the prime override (THE gate)', async () => {
    await expectPublishBlocked(
      payload.create({
        collection: 'properties',
        data: { ...validBase(), priceAmount: 15_000_000, _status: 'published' },
      }),
      /prime/i,
    );
  });

  it('blocks publishing with no enforceable value at all', async () => {
    await expectPublishBlocked(
      payload.create({
        collection: 'properties',
        data: { ...validBase(), publication: 'published_without_price', _status: 'published' },
      }),
      /internal value/i,
    );
  });

  it('never publishes below €10M, even marked prime', async () => {
    await expectPublishBlocked(
      payload.create({
        collection: 'properties',
        data: {
          ...validBase(),
          priceAmount: 9_000_000,
          valueTier: 'prime',
          _status: 'published',
        },
      }),
      /€10M/,
    );
  });

  it('publishes €10–20M when valueTier=prime was explicitly chosen', async () => {
    const created = await payload.create({
      collection: 'properties',
      data: {
        ...validBase(),
        priceAmount: 15_000_000,
        valueTier: 'prime',
        _status: 'published',
      },
    });
    expect(created.valueTier).toBe('prime');
  });

  it('enforces on internalValueEur for on-request listings', async () => {
    await expectPublishBlocked(
      payload.create({
        collection: 'properties',
        data: {
          ...validBase(),
          publication: 'published_without_price',
          internalValueEur: 14_000_000,
          _status: 'published',
        },
      }),
      /prime/i,
    );
  });

  it('publishes a valid listing: USD converts, tier derives, slug + lifecycle set', async () => {
    const created = await payload.create({
      collection: 'properties',
      data: {
        ...validBase(),
        currency: 'USD',
        priceAmount: 27_000_000,
        _status: 'published',
      },
    });
    // ~$27M is €23–26M at any plausible rate.
    expect(created.priceEur).toBeGreaterThan(20_000_000);
    expect(created.priceEur).toBeLessThan(27_000_000);
    expect(created.valueTier).toBe('trophy');
    expect(created.channel).toBe('public');
    expect(created.slug).toBeTruthy();
    expect(created.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(created.expiresAt).toBeTruthy();

    // §7.1 routing: public listing lands in public_listings only.
    const publicDoc = await findSearchDoc('public', created.id);
    expect(publicDoc).not.toBeNull();
    expect(publicDoc?.slug).toBe(created.slug);
    expect(await findSearchDoc('member', created.id)).toBeNull();
  });

  it('derives signature at €50M+', async () => {
    const created = await payload.create({
      collection: 'properties',
      data: { ...validBase(), priceAmount: 62_000_000, _status: 'published' },
    });
    expect(created.valueTier).toBe('signature');
  });

  it('off-market: no slug, member index only, and the exact price stays out of the public collection', async () => {
    const created = await payload.create({
      collection: 'properties',
      data: {
        ...validBase(),
        publication: 'off_market',
        priceAmount: 30_000_000,
        _status: 'published',
      },
    });
    expect(created.channel).toBe('off_market');
    expect(created.slug ?? null).toBeNull();

    const memberDoc = await findSearchDoc('member', created.id);
    expect(memberDoc).not.toBeNull();
    expect(await findSearchDoc('public', created.id)).toBeNull();

    // Flipping the channel back to public must remove the member document.
    const updated = await payload.update({
      collection: 'properties',
      id: created.id,
      data: { publication: 'published_openly' },
    });
    expect(updated.channel).toBe('public');
    expect(await findSearchDoc('member', created.id)).toBeNull();
    expect(await findSearchDoc('public', created.id)).not.toBeNull();
  });

  it('unpublishing removes the listing from both search collections', async () => {
    const created = await payload.create({
      collection: 'properties',
      data: { ...validBase(), priceAmount: 25_000_000, _status: 'published' },
    });
    expect(await findSearchDoc('public', created.id)).not.toBeNull();
    await payload.update({
      collection: 'properties',
      id: created.id,
      data: { status: 'withdrawn' },
    });
    expect(await findSearchDoc('public', created.id)).toBeNull();
    expect(await findSearchDoc('member', created.id)).toBeNull();
  });

  it('allows saving an inadmissible listing as a draft, with the reason in moderationNote', async () => {
    const draft = await payload.create({
      collection: 'properties',
      data: { ...validBase(), status: 'draft', priceAmount: 5_000_000, _status: 'draft' },
      draft: true,
    });
    expect(draft.moderationNote).toMatch(/€10M/);
  });
});
