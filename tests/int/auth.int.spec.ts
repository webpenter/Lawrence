import { NextRequest } from 'next/server';
import { getPayload, Payload } from 'payload';
import config from '@/payload.config';

import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import { POST as joinRoute } from '@/app/api/member/join/route';
import { POST as loginRoute } from '@/app/api/member/login/route';
import { GET as magicRedeem } from '@/app/api/member/magic-link/route';
import { GET as savedStatus, POST as savedToggle } from '@/app/api/member/saved/route';
import { POST as totpSetup } from '@/app/api/member/totp/setup/route';
import { POST as totpVerify } from '@/app/api/member/totp/verify/route';
import { createMagicLinkToken } from '@/lib/member/magic-link';
import { totpCode } from '@/lib/member/totp';
import type { Member } from '@/payload-types';

// Prompt 9 acceptance: the §8.5 registration flow end to end — join (blocked
// until confirmed), verify, login, magic link, TOTP — through the real route
// handlers against real Postgres.

let payload: Payload;
const suffix = Date.now().toString(36);
const EMAIL = `flow-${suffix}@test.lawrence`;
const PASSWORD = 'flow-password-123';

function jsonRequest(url: string, method: string, body?: unknown, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

async function sessionCookieFor(email: string): Promise<string> {
  const result = await payload.login({
    collection: 'members',
    data: { email, password: PASSWORD },
  });
  return `payload-token=${result.token}`;
}

describe('Membership flow (Prompt 9 acceptance)', () => {
  let agencyId: number;
  let propertyId: number;

  beforeAll(async () => {
    payload = await getPayload({ config: await config });
    const agency = await payload.create({
      collection: 'agencies',
      overrideAccess: true,
      data: { name: 'Auth Flow Agency', slug: `auth-agency-${suffix}` },
    });
    agencyId = agency.id;
    const property = await payload.create({
      collection: 'properties',
      overrideAccess: true,
      data: {
        title: `Auth flow off-market ${suffix}`,
        agency: agencyId,
        propertyType: 'villa',
        priceType: 'fixed',
        currency: 'EUR',
        priceAmount: 25_000_000,
        publication: 'off_market',
        channel: 'off_market',
        priceDisclosure: 'exact',
        status: 'available',
        moderation: 'unreviewed',
        sourceType: 'manual',
        _status: 'published',
      },
    });
    propertyId = property.id;
  });

  afterAll(async () => {
    await payload.delete({
      collection: 'saved-listings',
      where: { property: { equals: propertyId } },
      overrideAccess: true,
    });
    await payload.delete({
      collection: 'member-activity',
      where: { property: { equals: propertyId } },
      overrideAccess: true,
    });
    await payload.delete({
      collection: 'properties',
      where: { id: { equals: propertyId } },
      overrideAccess: true,
    });
    await payload.delete({
      collection: 'members',
      where: { email: { like: `%${suffix}@test.lawrence` } },
      overrideAccess: true,
    });
    await payload.delete({
      collection: 'agencies',
      where: { id: { equals: agencyId } },
      overrideAccess: true,
    });
  });

  it('join creates an unverified member; login is blocked until the confirmation click', async () => {
    const res = await joinRoute(
      jsonRequest('/api/member/join', 'POST', { email: EMAIL, password: PASSWORD }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, requiresVerification: true });

    // §2.3: the off-market gate is the confirmed email — login must fail now.
    const blocked = await loginRoute(
      jsonRequest('/api/member/login', 'POST', { email: EMAIL, password: PASSWORD }),
    );
    expect(blocked.status).toBe(401);
  });

  it('the confirmation click verifies, and login opens with the session cookie', async () => {
    const member = (await payload.find({
      collection: 'members',
      where: { email: { equals: EMAIL } },
      limit: 1,
      overrideAccess: true,
      showHiddenFields: true,
    })) as { docs: Array<Member & { _verificationToken?: string | null }> };
    const token = member.docs[0]?._verificationToken;
    expect(token).toBeTruthy();

    expect(await payload.verifyEmail({ collection: 'members', token: token as string })).toBe(true);

    const res = await loginRoute(
      jsonRequest('/api/member/login', 'POST', { email: EMAIL, password: PASSWORD }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toContain('payload-token=');
  });

  it('join responds identically for an existing address (no enumeration)', async () => {
    const res = await joinRoute(
      jsonRequest('/api/member/join', 'POST', { email: EMAIL, password: 'another-pass-123' }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, requiresVerification: true });
  });

  it('a magic link redeems into a session and redirects to /off-market', async () => {
    const token = createMagicLinkToken(EMAIL);
    const res = await magicRedeem(
      new NextRequest(`http://localhost:3000/api/member/magic-link?token=${encodeURIComponent(token)}`),
    );
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.headers.get('location')).toContain('/en/off-market');
    expect(res.headers.get('set-cookie')).toContain('payload-token=');
  });

  it('an invalid magic link lands on login with NO session', async () => {
    const res = await magicRedeem(
      new NextRequest('http://localhost:3000/api/member/magic-link?token=garbage'),
    );
    expect(res.headers.get('location')).toContain('/en/login');
    expect(res.headers.get('set-cookie') ?? '').not.toContain('payload-token=ey');
  });

  it('saved listings toggle through the route, and anonymous callers get 401', async () => {
    const anon = await savedToggle(
      jsonRequest('/api/member/saved', 'POST', { propertyId }),
    );
    expect(anon.status).toBe(401);

    const cookie = await sessionCookieFor(EMAIL);
    const on = await savedToggle(jsonRequest('/api/member/saved', 'POST', { propertyId }, cookie));
    expect((await on.json()).saved).toBe(true);

    const status = await savedStatus(
      jsonRequest(`/api/member/saved?property=${propertyId}`, 'GET', undefined, cookie),
    );
    expect((await status.json()).saved).toBe(true);

    const off = await savedToggle(jsonRequest('/api/member/saved', 'POST', { propertyId }, cookie));
    expect((await off.json()).saved).toBe(false);
  });

  it('TOTP enrols with one valid code and then gates login behind the challenge', async () => {
    const cookie = await sessionCookieFor(EMAIL);

    const setup = await totpSetup(jsonRequest('/api/member/totp/setup', 'POST', {}, cookie));
    expect(setup.status).toBe(200);
    const { secret } = (await setup.json()) as { secret: string };
    expect(secret).toMatch(/^[A-Z2-7]+$/);

    const bad = await totpVerify(
      jsonRequest('/api/member/totp/verify', 'POST', { code: '000000' }, cookie),
    );
    expect(bad.status).toBe(401);

    const good = await totpVerify(
      jsonRequest('/api/member/totp/verify', 'POST', { code: totpCode(secret) }, cookie),
    );
    expect(good.status).toBe(200);

    // Password alone now yields a challenge, not a session.
    const step1 = await loginRoute(
      jsonRequest('/api/member/login', 'POST', { email: EMAIL, password: PASSWORD }),
    );
    const body = (await step1.json()) as { requiresTotp?: boolean; challenge?: string };
    expect(body.requiresTotp).toBe(true);
    expect(step1.headers.get('set-cookie') ?? '').not.toContain('payload-token=ey');

    const step2 = await loginRoute(
      jsonRequest('/api/member/login', 'POST', {
        challenge: body.challenge,
        code: totpCode(secret),
      }),
    );
    expect(step2.status).toBe(200);
    expect(step2.headers.get('set-cookie')).toContain('payload-token=');
  });
});
