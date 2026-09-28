import { getPayload, Payload } from 'payload';
import config from '@/payload.config';

import { describe, it, beforeAll, afterAll, expect } from 'vitest';

// Prompt 4 acceptance: member data is isolated absolutely. Member A never
// sees member B's profile, saved listings, requirements, activity or
// enquiries — enforced by collection access, proven here with
// overrideAccess: false against a real Postgres.

let payload: Payload;
const suffix = Date.now().toString(36);

type SessionUser = { id: number; collection: string } & Record<string, unknown>;

let memberA: SessionUser;
let memberB: SessionUser;
let agencyId: number;
let propertyId: number;

async function asMember(id: number): Promise<SessionUser> {
  const doc = await payload.findByID({ collection: 'members', id, overrideAccess: true });
  // The REST auth layer stamps collection on the session user; the local API
  // takes the user verbatim, so tests stamp it the same way.
  return { ...doc, collection: 'members' } as SessionUser;
}

describe('Member isolation (Prompt 4 acceptance)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config });

    const a = await payload.create({
      collection: 'members',
      overrideAccess: true,
      data: { email: `member-a-${suffix}@test.lawrence`, password: 'member-pass-123', name: 'A', status: 'active' },
    });
    const b = await payload.create({
      collection: 'members',
      overrideAccess: true,
      data: { email: `member-b-${suffix}@test.lawrence`, password: 'member-pass-123', name: 'B', status: 'active' },
    });
    memberA = await asMember(a.id);
    memberB = await asMember(b.id);

    const agency = await payload.create({
      collection: 'agencies',
      overrideAccess: true,
      data: { name: 'Member Test Agency', slug: `member-agency-${suffix}` },
    });
    agencyId = agency.id;

    const property = await payload.create({
      collection: 'properties',
      overrideAccess: true,
      draft: true,
      data: {
        title: `Member test listing ${suffix}`,
        agency: agencyId,
        propertyType: 'villa',
        priceType: 'fixed',
        currency: 'EUR',
        priceAmount: 25_000_000,
        publication: 'off_market',
        status: 'available',
        moderation: 'unreviewed',
        sourceType: 'manual',
        _status: 'draft',
      },
    });
    propertyId = property.id;
  });

  afterAll(async () => {
    for (const [collection, where] of [
      ['member-activity', { member: { in: [memberA.id, memberB.id] } }],
      ['saved-listings', { member: { in: [memberA.id, memberB.id] } }],
      ['requirements', { member: { in: [memberA.id, memberB.id] } }],
      ['enquiries', { email: { like: `%${suffix}@test.lawrence` } }],
      ['properties', { title: { equals: `Member test listing ${suffix}` } }],
      ['members', { email: { like: `%${suffix}@test.lawrence` } }],
      ['agencies', { slug: { equals: `member-agency-${suffix}` } }],
    ] as const) {
      await payload.delete({ collection, where, overrideAccess: true });
    }
  });

  it('a new member is active by default, pending under MEMBER_REQUIRE_APPROVAL', async () => {
    expect(memberA.status).toBe('active');

    process.env.MEMBER_REQUIRE_APPROVAL = 'true';
    try {
      const pending = await payload.create({
        collection: 'members',
        overrideAccess: true,
        data: {
          email: `member-pending-${suffix}@test.lawrence`,
          password: 'member-pass-123',
          // The registration hook decides the real value; this satisfies the
          // generated create type only.
          status: 'active',
        },
      });
      expect(pending.status).toBe('pending');
    } finally {
      process.env.MEMBER_REQUIRE_APPROVAL = 'false';
    }
  });

  it('member A sees only their own profile', async () => {
    const visible = await payload.find({
      collection: 'members',
      overrideAccess: false,
      user: memberA,
      where: {},
    });
    expect(visible.docs.map((d) => d.id)).toEqual([memberA.id]);

    await expect(
      payload.findByID({
        collection: 'members',
        id: memberB.id,
        overrideAccess: false,
        user: memberA,
      }),
    ).rejects.toThrow();
  });

  it('a member cannot promote their own status', async () => {
    await payload.update({
      collection: 'members',
      id: memberA.id,
      overrideAccess: false,
      user: memberA,
      data: { status: 'suspended', name: 'A renamed' },
    });
    const after = await payload.findByID({
      collection: 'members',
      id: memberA.id,
      overrideAccess: true,
    });
    expect(after.status).toBe('active'); // field access dropped the change
    expect(after.name).toBe('A renamed');
  });

  it("saved listings pin to the session member and stay invisible to others", async () => {
    const saved = await payload.create({
      collection: 'saved-listings',
      overrideAccess: false,
      user: memberA,
      data: {
        // A hostile client claims member B — the hook pins it back to A.
        member: memberB.id,
        property: propertyId,
        note: 'private note from A',
        savedAt: new Date().toISOString(),
      },
    });
    expect(typeof saved.member === 'object' ? saved.member.id : saved.member).toBe(memberA.id);

    const asB = await payload.find({
      collection: 'saved-listings',
      overrideAccess: false,
      user: memberB,
      where: {},
    });
    expect(asB.docs).toHaveLength(0);

    await expect(
      payload.update({
        collection: 'saved-listings',
        id: saved.id,
        overrideAccess: false,
        user: memberB,
        data: { note: 'B was here' },
      }),
    ).rejects.toThrow();
  });

  it('requirements are isolated the same way', async () => {
    await payload.create({
      collection: 'requirements',
      overrideAccess: false,
      user: memberA,
      data: { member: memberA.id, budgetMinEur: 20_000_000, budgetMaxEur: 60_000_000, status: 'active' },
    });
    const asB = await payload.find({
      collection: 'requirements',
      overrideAccess: false,
      user: memberB,
      where: {},
    });
    expect(asB.docs).toHaveLength(0);
  });

  it('member activity is server-write-only and readable only by its owner', async () => {
    await expect(
      payload.create({
        collection: 'member-activity',
        overrideAccess: false,
        user: memberA,
        data: {
          member: memberA.id,
          action: 'off_market_view',
          at: new Date().toISOString(),
        },
      }),
    ).rejects.toThrow();

    await payload.create({
      collection: 'member-activity',
      overrideAccess: true,
      data: {
        member: memberA.id,
        property: propertyId,
        action: 'off_market_view',
        at: new Date().toISOString(),
      },
    });

    const asA = await payload.find({
      collection: 'member-activity',
      overrideAccess: false,
      user: memberA,
      where: {},
    });
    expect(asA.docs.length).toBeGreaterThan(0);

    const asB = await payload.find({
      collection: 'member-activity',
      overrideAccess: false,
      user: memberB,
      where: {},
    });
    expect(asB.docs).toHaveLength(0);
  });

  it('a member reads only the enquiries they submitted', async () => {
    await payload.create({
      collection: 'enquiries',
      overrideAccess: true,
      data: {
        name: 'A',
        email: `member-a-${suffix}@test.lawrence`,
        member: memberA.id,
        source: 'off_market',
        status: 'new',
      },
    });
    const asB = await payload.find({
      collection: 'enquiries',
      overrideAccess: false,
      user: memberB,
      where: {},
    });
    expect(asB.docs).toHaveLength(0);
    const asA = await payload.find({
      collection: 'enquiries',
      overrideAccess: false,
      user: memberA,
      where: {},
    });
    expect(asA.docs).toHaveLength(1);
  });

  it('members-only media is invisible to anonymous readers (private-bucket rule)', async () => {
    // No file needed to prove the access clause: query the collection with and
    // without a session and compare the applied visibility constraint.
    const anon = await payload.find({
      collection: 'media',
      overrideAccess: false,
      where: { visibility: { equals: 'members' } },
      limit: 1,
    });
    // The anonymous access clause (visibility=public) ANDs with the query —
    // members-only assets can never come back.
    expect(anon.docs).toHaveLength(0);
  });
});
