import { getPayload, Payload } from 'payload';
import config from '@/payload.config';

import { describe, it, beforeAll, afterAll, expect } from 'vitest';

// Prompt 4 acceptance: agency B gets empty/denied results on agency A's
// listings and leads; an agency_agent cannot publish; an editor can.
// Exercises the same tenant() access functions the REST API and admin UI use,
// via the local API with overrideAccess: false. Requires a reachable DATABASE_URL.

let payload: Payload;
const suffix = Date.now().toString(36);

let agencyA: { id: number };
let agencyB: { id: number };
let adminUser: { id: number };
let editorUser: { id: number };
let agencyAAdmin: { id: number };
let agencyBAdmin: { id: number };
let agentAUser: { id: number };
let listingA: { id: number };

async function makeUser(role: string, agency?: number, agentProfile?: number) {
  return payload.create({
    collection: 'users',
    overrideAccess: true,
    data: {
      email: `${role}-${agency ?? 'hq'}-${suffix}@test.lawrence`,
      password: 'test-password-123',
      name: `${role} test`,
      role: role as 'admin',
      agency,
      agentProfile,
    },
  });
}

describe('Multi-tenancy (Prompt 4 acceptance)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config });

    agencyA = await payload.create({
      collection: 'agencies',
      overrideAccess: true,
      data: { name: 'Agency A', slug: `agency-a-${suffix}` },
    });
    agencyB = await payload.create({
      collection: 'agencies',
      overrideAccess: true,
      data: { name: 'Agency B', slug: `agency-b-${suffix}` },
    });

    adminUser = await makeUser('admin');
    editorUser = await makeUser('editor');
    agencyAAdmin = await makeUser('agency_admin', agencyA.id);
    agencyBAdmin = await makeUser('agency_admin', agencyB.id);

    const agentProfileA = await payload.create({
      collection: 'agents',
      overrideAccess: true,
      data: { name: 'Agent A', agency: agencyA.id },
    });
    agentAUser = await makeUser('agency_agent', agencyA.id, agentProfileA.id);

    // The agent must be named on the listing: tenant({ agentField: 'agent' })
    // scopes agency_agent updates to their own docs (spec §8.1 row 1).
    listingA = await payload.create({
      collection: 'properties',
      overrideAccess: true,
      data: {
        title: 'Agency A listing',
        agency: agencyA.id,
        agent: agentProfileA.id,
        propertyType: 'villa',
        priceType: 'fixed',
        currency: 'EUR',
        priceAmount: 25_000_000,
        publication: 'published_openly',
        status: 'draft',
        moderation: 'unreviewed',
        sourceType: 'manual',
        _status: 'draft',
      },
      draft: true,
    });

    await payload.create({
      collection: 'enquiries',
      overrideAccess: true,
      data: {
        name: 'Buyer',
        email: `buyer-${suffix}@test.lawrence`,
        source: 'listing',
        status: 'new',
        property: listingA.id,
        agency: agencyA.id,
      },
    });
  });

  afterAll(async () => {
    for (const [collection, where] of [
      ['enquiries', { email: { like: `%${suffix}@test.lawrence` } }],
      ['properties', { title: { equals: 'Agency A listing' } }],
      ['agents', { name: { equals: 'Agent A' } }],
      ['users', { email: { like: `%${suffix}@test.lawrence` } }],
      ['agencies', { slug: { like: `%${suffix}` } }],
    ] as const) {
      await payload.delete({ collection, where, overrideAccess: true });
    }
  });

  async function findAs(userId: number, collection: 'properties' | 'enquiries' | 'agencies') {
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
      overrideAccess: true,
    });
    return payload.find({
      collection,
      overrideAccess: false,
      user,
      where: {},
      draft: collection === 'properties',
    });
  }

  it("agency B sees none of agency A's listings", async () => {
    const results = await findAs(agencyBAdmin.id, 'properties');
    expect(results.docs.map((d) => d.id)).not.toContain(listingA.id);
  });

  it("agency A's admin does see their own listing", async () => {
    const results = await findAs(agencyAAdmin.id, 'properties');
    expect(results.docs.map((d) => d.id)).toContain(listingA.id);
  });

  it("agency B sees none of agency A's leads", async () => {
    const results = await findAs(agencyBAdmin.id, 'enquiries');
    expect(results.docs).toHaveLength(0);
  });

  it("agency B cannot read agency A's profile", async () => {
    const results = await findAs(agencyBAdmin.id, 'agencies');
    const ids = results.docs.map((d) => d.id);
    expect(ids).toContain(agencyB.id);
    expect(ids).not.toContain(agencyA.id);
  });

  it('an agency_agent cannot publish: the attempt stays a draft awaiting review', async () => {
    const user = await payload.findByID({
      collection: 'users',
      id: agentAUser.id,
      overrideAccess: true,
    });
    const updated = await payload.update({
      collection: 'properties',
      id: listingA.id,
      overrideAccess: false,
      user,
      data: { status: 'available', _status: 'published' },
      draft: true,
    });
    expect(updated._status).not.toBe('published');
    expect(updated.moderation).toBe('unreviewed');
  });

  it('an editor can publish directly', async () => {
    const user = await payload.findByID({
      collection: 'users',
      id: editorUser.id,
      overrideAccess: true,
    });
    const updated = await payload.update({
      collection: 'properties',
      id: listingA.id,
      overrideAccess: false,
      user,
      data: { status: 'available', moderation: 'approved', _status: 'published' },
    });
    expect(updated.status).toBe('available');
  });

  it('audit log entries were written and are invisible to agents', async () => {
    const asAdmin = await payload.findByID({
      collection: 'users',
      id: adminUser.id,
      overrideAccess: true,
    });
    const logs = await payload.find({
      collection: 'audit-logs',
      overrideAccess: false,
      user: asAdmin,
      where: { targetCollection: { equals: 'properties' } },
    });
    expect(logs.totalDocs).toBeGreaterThan(0);

    const asAgent = await payload.findByID({
      collection: 'users',
      id: agentAUser.id,
      overrideAccess: true,
    });
    // Audit-log access denies agents outright (boolean false), and Payload
    // rejects a denied find with Forbidden rather than returning an empty page.
    await expect(
      payload.find({ collection: 'audit-logs', overrideAccess: false, user: asAgent }),
    ).rejects.toThrow(/not allowed/i);
  });
});
