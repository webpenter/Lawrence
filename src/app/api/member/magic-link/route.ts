import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getPayloadClient } from '@/lib/db';
import { sendEmail } from '@/lib/email/send';
import { createMagicLinkToken, verifyMagicLinkToken } from '@/lib/member/magic-link';
import { setMemberSession } from '@/lib/member/session';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import type { Member } from '@/payload-types';

/**
 * §2.3 "or a magic link". POST requests one (the response is identical
 * whether the address exists or not); GET redeems it — clicking a link at
 * that address IS email verification, so redemption also confirms the
 * account and opens the off-market collection immediately.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const limit = checkRateLimit(request, 'magic-link', { windowMs: 15 * 60 * 1000, max: 5 });
  if (!limit.success) return rateLimitResponse(limit);

  const parsed = z
    .object({ email: z.string().email().max(320) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const payload = await getPayloadClient();
  const existing = await payload.find({
    collection: 'members',
    where: { email: { equals: parsed.data.email.toLowerCase().trim() } },
    limit: 1,
    overrideAccess: true,
  });

  if (existing.docs[0]) {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const token = createMagicLinkToken(parsed.data.email);
    const url = `${base}/api/member/magic-link?token=${encodeURIComponent(token)}`;
    await sendEmail({
      to: parsed.data.email,
      subject: 'Your one-time link to Lawrence',
      text: `Continue to the off-market collection (valid 15 minutes): ${url}`,
      html: `<p>Continue to the off-market collection (valid 15 minutes):</p><p><a href="${url}">${url}</a></p>`,
    }).catch((err) => console.error('[magic-link] send failed:', err));
  }

  // Always the same answer — no address enumeration.
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const result = verifyMagicLinkToken(token);
  if (!result.ok || !result.email) return NextResponse.redirect(`${base}/en/login`);

  const payload = await getPayloadClient();
  const found = await payload.find({
    collection: 'members',
    where: { email: { equals: result.email } },
    limit: 1,
    overrideAccess: true,
  });
  const member = found.docs[0] as Member | undefined;
  if (!member || member.status !== 'active') return NextResponse.redirect(`${base}/en/login`);

  // The click proves the address: mark verified if not already.
  if (!(member as { _verified?: boolean })._verified) {
    await payload.update({
      collection: 'members',
      id: member.id,
      data: { _verified: true, emailVerifiedAt: new Date().toISOString() },
      overrideAccess: true,
    });
  }

  const response = NextResponse.redirect(`${base}/en/off-market`);
  await setMemberSession(response, member);
  return response;
}
