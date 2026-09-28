import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getPayloadClient } from '@/lib/db';
import { memberFromRequest } from '@/lib/member/session';

/**
 * §11.7 saved listings. GET reports whether ONE property is saved (the
 * SaveCta's initial state); POST toggles. Anonymous callers get 401 — the
 * client routes them to /join, which is the §12.3 story.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const member = await memberFromRequest(request);
  if (!member) return NextResponse.json({ ok: false }, { status: 401 });

  const propertyId = Number(new URL(request.url).searchParams.get('property'));
  if (!Number.isFinite(propertyId)) return NextResponse.json({ ok: false }, { status: 400 });

  const payload = await getPayloadClient();
  const existing = await payload.find({
    collection: 'saved-listings',
    where: { and: [{ member: { equals: member.id } }, { property: { equals: propertyId } }] },
    limit: 1,
    overrideAccess: true,
  });
  return NextResponse.json({ ok: true, saved: Boolean(existing.docs[0]) });
}

const toggleSchema = z.object({
  propertyId: z.number().int().positive(),
  note: z.string().max(5000).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const member = await memberFromRequest(request);
  if (!member) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = toggleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const payload = await getPayloadClient();
  const existing = await payload.find({
    collection: 'saved-listings',
    where: {
      and: [{ member: { equals: member.id } }, { property: { equals: parsed.data.propertyId } }],
    },
    limit: 1,
    overrideAccess: true,
  });

  if (existing.docs[0]) {
    await payload.delete({
      collection: 'saved-listings',
      id: existing.docs[0].id,
      overrideAccess: true,
    });
    return NextResponse.json({ ok: true, saved: false });
  }

  await payload.create({
    collection: 'saved-listings',
    data: {
      member: member.id,
      property: parsed.data.propertyId,
      note: parsed.data.note,
      savedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  });
  await payload.create({
    collection: 'member-activity',
    data: {
      member: member.id,
      property: parsed.data.propertyId,
      action: 'saved',
      at: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent') ?? undefined,
    },
    overrideAccess: true,
  });
  return NextResponse.json({ ok: true, saved: true });
}
