import { NextResponse, type NextRequest } from 'next/server';

import { getPayloadClient } from '@/lib/db';

/**
 * §8.5 step 2 — the confirmation click. One click: verify, then land on
 * login with the "your account is open" state. Invalid tokens land on the
 * same page without detail — nothing to probe.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  if (token) {
    try {
      const payload = await getPayloadClient();
      const ok = await payload.verifyEmail({ collection: 'members', token });
      if (ok) {
        // Mirror the spec's emailVerifiedAt (the REST hook path does this on
        // _verified writes; verifyEmail bypasses hooks, so stamp explicitly).
        const members = await payload.find({
          collection: 'members',
          where: { emailVerifiedAt: { equals: null } },
          limit: 100,
          overrideAccess: true,
        });
        for (const member of members.docs) {
          if ((member as { _verified?: boolean })._verified) {
            await payload.update({
              collection: 'members',
              id: member.id,
              data: { emailVerifiedAt: new Date().toISOString() },
              overrideAccess: true,
            });
          }
        }
        return NextResponse.redirect(`${base}/en/login?verified=1`);
      }
    } catch {
      // fall through to the neutral redirect
    }
  }
  return NextResponse.redirect(`${base}/en/login`);
}
