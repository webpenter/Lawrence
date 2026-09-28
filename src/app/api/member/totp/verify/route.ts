import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getPayloadClient } from '@/lib/db';
import { memberFromRequest } from '@/lib/member/session';
import { verifyTotp } from '@/lib/member/totp';
import type { Member } from '@/payload-types';

/** §8.5 optional TOTP, step 2: one valid code promotes the pending secret. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const member = await memberFromRequest(request);
  if (!member) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = z
    .object({ code: z.string().max(10) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const payload = await getPayloadClient();
  const withSecrets = (await payload.findByID({
    collection: 'members',
    id: member.id,
    overrideAccess: true,
    showHiddenFields: true,
  })) as Member & { pendingTotpSecret?: string | null };

  if (!withSecrets.pendingTotpSecret) return NextResponse.json({ ok: false }, { status: 400 });
  if (!verifyTotp(withSecrets.pendingTotpSecret, parsed.data.code)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await payload.update({
    collection: 'members',
    id: member.id,
    data: {
      totpSecret: withSecrets.pendingTotpSecret,
      pendingTotpSecret: null,
      twoFactorEnabled: true,
    },
    overrideAccess: true,
  });
  return NextResponse.json({ ok: true, enabled: true });
}
