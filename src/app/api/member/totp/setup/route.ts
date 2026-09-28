import { NextResponse, type NextRequest } from 'next/server';

import { brand } from '@/config/brand';
import { getPayloadClient } from '@/lib/db';
import { memberFromRequest } from '@/lib/member/session';
import { generateTotpSecret, totpUri } from '@/lib/member/totp';

/**
 * §8.5 optional TOTP, step 1: mint a pending secret and hand back the
 * otpauth:// URI for the authenticator app. Nothing is enforced until
 * /api/member/totp/verify confirms one valid code.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const member = await memberFromRequest(request);
  if (!member) return NextResponse.json({ ok: false }, { status: 401 });

  const secret = generateTotpSecret();
  const payload = await getPayloadClient();
  await payload.update({
    collection: 'members',
    id: member.id,
    data: { pendingTotpSecret: secret },
    overrideAccess: true,
  });

  return NextResponse.json({
    ok: true,
    secret,
    uri: totpUri(secret, member.email, brand.name),
  });
}
