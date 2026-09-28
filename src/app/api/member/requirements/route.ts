import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { FEATURES, PROPERTY_TYPES } from '@/collections/Property/enums';
import { getPayloadClient } from '@/lib/db';
import { memberFromRequest } from '@/lib/member/session';

const requirementSchema = z.object({
  budgetMinEur: z.number().int().min(0).nullable().optional(),
  budgetMaxEur: z.number().int().min(0).nullable().optional(),
  markets: z.array(z.number().int().positive()).max(20).optional(),
  propertyTypes: z.array(z.enum(PROPERTY_TYPES)).max(20).optional(),
  mustHaveFeatures: z.array(z.enum(FEATURES)).max(20).optional(),
  timeline: z.enum(['immediate', '6_months', '12_months', 'opportunistic']).nullable().optional(),
  notes: z.string().max(5000).optional(),
  notifyByEmail: z.boolean().optional(),
});

/** §8.5 step 5 — the requirements profile: one active record per member, upserted. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const member = await memberFromRequest(request);
  if (!member) return NextResponse.json({ ok: false }, { status: 401 });

  const payload = await getPayloadClient();
  const existing = await payload.find({
    collection: 'requirements',
    where: { and: [{ member: { equals: member.id } }, { status: { equals: 'active' } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return NextResponse.json({ ok: true, requirement: existing.docs[0] ?? null });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const member = await memberFromRequest(request);
  if (!member) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = requirementSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const payload = await getPayloadClient();
  const existing = await payload.find({
    collection: 'requirements',
    where: { and: [{ member: { equals: member.id } }, { status: { equals: 'active' } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const data = { ...parsed.data, member: member.id, status: 'active' as const };
  const saved = existing.docs[0]
    ? await payload.update({
        collection: 'requirements',
        id: existing.docs[0].id,
        data,
        overrideAccess: true,
      })
    : await payload.create({ collection: 'requirements', data, overrideAccess: true });

  return NextResponse.json({ ok: true, requirement: saved });
}
