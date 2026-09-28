import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getPayloadClient } from '@/lib/db';
import { memberFromRequest } from '@/lib/member/session';

const profileSchema = z.object({
  name: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  country: z.string().max(2).optional(),
  preferredLocale: z.enum(['en', 'it', 'fr', 'de', 'es', 'ru']).optional(),
  memberType: z.enum(['buyer', 'advisor', 'broker', 'developer', 'other']).nullable().optional(),
  marketingConsent: z.boolean().optional(),
});

/** §11.7 profile & email preferences. Runs WITHOUT overrideAccess — the
 * member field access (status/source/utm locked) applies as designed. */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const member = await memberFromRequest(request);
  if (!member) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const payload = await getPayloadClient();
  const updated = await payload.update({
    collection: 'members',
    id: member.id,
    data: parsed.data,
    overrideAccess: false,
    user: { ...member, collection: 'members' },
  });
  return NextResponse.json({
    ok: true,
    profile: {
      name: updated.name,
      phone: updated.phone,
      country: updated.country,
      preferredLocale: updated.preferredLocale,
      memberType: updated.memberType,
      marketingConsent: updated.marketingConsent,
    },
  });
}
