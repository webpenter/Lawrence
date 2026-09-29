import { NextRequest } from 'next/server';
import { getPayload, Payload } from 'payload';
import config from '@/payload.config';

import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import { POST as enquiryRoute } from '@/app/api/enquiry/route';
import { getAdminDashboard, getAgencyDashboard } from '@/lib/db/dashboard';

// Prompt 11 acceptance: an enquiry routes and appears in the queue (with the
// memberId, UTM and consent attached), and both dashboards answer under one
// second against the sample dataset.

let payload: Payload;
const suffix = Date.now().toString(36);
const EMAIL = `p11-${suffix}@test.lawrence`;
const PASSWORD = 'p11-password-123';

function jsonRequest(url: string, body: unknown, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.7',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('Phase 11 acceptance', () => {
  let memberId: number;
  let cookie: string;
  let propertyId: number;

  beforeAll(async () => {
    payload = await getPayload({ config: await config });
    const member = await payload.create({
      collection: 'members',
      overrideAccess: true,
      data: {
        email: EMAIL,
        password: PASSWORD,
        status: 'active',
        _verified: true,
      } as never,
    });
    memberId = member.id;
    const login = await payload.login({
      collection: 'members',
      data: { email: EMAIL, password: PASSWORD },
    });
    cookie = `payload-token=${login.token}`;

    const property = await payload.find({
      collection: 'properties',
      where: { channel: { equals: 'public' } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    propertyId = property.docs[0]!.id;
  });

  afterAll(async () => {
    await payload.delete({
      collection: 'enquiries',
      where: { email: { equals: EMAIL } },
      overrideAccess: true,
    });
    await payload.delete({
      collection: 'member-activity',
      where: { member: { equals: memberId } },
      overrideAccess: true,
    });
    await payload.delete({
      collection: 'members',
      where: { id: { equals: memberId } },
      overrideAccess: true,
    });
  });

  it('an authenticated enquiry lands in the queue with member, UTM and consent', async () => {
    const res = await enquiryRoute(
      jsonRequest(
        '/api/enquiry',
        {
          name: 'Phase Eleven',
          email: EMAIL,
          message: 'Interested in the estate.',
          propertyId,
          source: 'listing',
          consent: true,
          locale: 'en',
          startedAt: Date.now() - 10_000,
          utm: { utm_source: 'newsletter', utm_campaign: 'sept' },
        },
        cookie,
      ),
    );
    expect(res.status).toBe(201);

    const stored = await payload.find({
      collection: 'enquiries',
      where: { email: { equals: EMAIL } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const enquiry = stored.docs[0]!;
    expect(enquiry).toBeTruthy();
    expect(typeof enquiry.member === 'object' ? enquiry.member : enquiry.member).toBe(memberId);
    expect(enquiry.utm).toMatchObject({ utm_source: 'newsletter', utm_campaign: 'sept' });
    expect(enquiry.consent?.consentIp).toBe('203.0.113.7');
    expect(['new', 'sent']).toContain(enquiry.status);

    // §8.7: the enquiry is on the member's activity trail.
    const activity = await payload.find({
      collection: 'member-activity',
      where: {
        and: [{ member: { equals: memberId } }, { action: { equals: 'enquiry' } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    expect(activity.totalDocs).toBeGreaterThanOrEqual(1);
  });

  it('the admin dashboard answers §9.2 in under one second (warm)', async () => {
    await getAdminDashboard(); // warm the connection + caches
    const start = performance.now();
    const data = await getAdminDashboard();
    const elapsed = performance.now() - start;

    expect(data.inventory.byChannel).toBeTypeOf('object');
    expect(data.inventory.byMarket.length).toBeGreaterThan(0);
    expect(data.members.total).toBeGreaterThan(0);
    expect(Array.isArray(data.enquiries.weekly)).toBe(true);
    expect(Array.isArray(data.requirementsBoard)).toBe(true);
    expect(data.dataQuality).toHaveProperty('missingImages');
    expect(data.dataQuality).toHaveProperty('expiringSoon');
    expect(elapsed, `admin dashboard took ${Math.round(elapsed)}ms`).toBeLessThan(1000);
  });

  it('the agency dashboard answers in under one second (warm)', async () => {
    const agencies = await payload.find({
      collection: 'agencies',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const agencyId = agencies.docs[0]!.id;
    await getAgencyDashboard(agencyId);
    const start = performance.now();
    const data = await getAgencyDashboard(agencyId);
    const elapsed = performance.now() - start;
    expect(data.listingsByStatus).toBeTypeOf('object');
    expect(elapsed, `agency dashboard took ${Math.round(elapsed)}ms`).toBeLessThan(1000);
  });
});
