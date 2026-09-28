import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getPayloadClient } from '@/lib/db';
import {
  createTotpChallenge,
  setMemberSession,
  verifyTotpChallenge,
} from '@/lib/member/session';
import { verifyTotp } from '@/lib/member/totp';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import type { Member } from '@/payload-types';

const loginSchema = z.union([
  z.object({
    email: z.string().email().max(320),
    password: z.string().min(1).max(200),
  }),
  z.object({
    challenge: z.string().max(2000),
    code: z.string().max(10),
  }),
]);

/**
 * §8.5 login: password first; when the member has TOTP enabled the response
 * carries a short-lived challenge instead of a session, and the second POST
 * (challenge + code) completes it. Errors are uniform — no distinguishing
 * "wrong password" from "no such account".
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const limit = checkRateLimit(request, 'member-login', { windowMs: 10 * 60 * 1000, max: 20 });
  if (!limit.success) return rateLimitResponse(limit);

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const payload = await getPayloadClient();

  // Step 2: TOTP completion.
  if ('challenge' in parsed.data) {
    const memberId = await verifyTotpChallenge(parsed.data.challenge);
    if (!memberId) return NextResponse.json({ ok: false }, { status: 401 });
    const member = (await payload
      .findByID({ collection: 'members', id: memberId, overrideAccess: true, showHiddenFields: true })
      .catch(() => null)) as (Member & { totpSecret?: string | null }) | null;
    if (!member?.twoFactorEnabled || !member.totpSecret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    if (!verifyTotp(member.totpSecret, parsed.data.code)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    await setMemberSession(response, member);
    return response;
  }

  // Step 1: password.
  try {
    const result = await payload.login({
      collection: 'members',
      data: { email: parsed.data.email, password: parsed.data.password },
    });
    const member = result.user as unknown as Member;

    if (member.twoFactorEnabled) {
      // Do not hand over the session yet — issue the 5-minute challenge.
      return NextResponse.json({
        ok: true,
        requiresTotp: true,
        challenge: await createTotpChallenge(member.id),
      });
    }

    const response = NextResponse.json({ ok: true });
    if (result.token) {
      response.cookies.set('payload-token', result.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 14,
      });
    } else {
      await setMemberSession(response, member);
    }
    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
