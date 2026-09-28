import { NextResponse, type NextRequest } from 'next/server';

import { logAudit } from '@/lib/audit';
import { getPayloadClient } from '@/lib/db';
import { clearMemberSession, memberFromRequest } from '@/lib/member/session';

/**
 * §8.5 step 6 — self-service deletion: removes saved listings and
 * requirements, deletes the activity trail (the strongest reading of
 * "anonymises" — listing-level aggregates already counted), detaches the
 * member from their enquiries (the enquiry itself is the agent's business
 * record), then deletes the account and ends the session. Irreversible.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const member = await memberFromRequest(request);
  if (!member) return NextResponse.json({ ok: false }, { status: 401 });

  const payload = await getPayloadClient();
  const memberId = member.id;

  await payload.delete({
    collection: 'saved-listings',
    where: { member: { equals: memberId } },
    overrideAccess: true,
  });
  await payload.delete({
    collection: 'requirements',
    where: { member: { equals: memberId } },
    overrideAccess: true,
  });
  await payload.delete({
    collection: 'member-activity',
    where: { member: { equals: memberId } },
    overrideAccess: true,
  });

  const enquiries = await payload.find({
    collection: 'enquiries',
    where: { member: { equals: memberId } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  });
  for (const enquiry of enquiries.docs) {
    await payload.update({
      collection: 'enquiries',
      id: enquiry.id,
      data: { member: null },
      overrideAccess: true,
    });
  }

  await payload.delete({ collection: 'members', id: memberId, overrideAccess: true });
  await logAudit(
    { payload, user: null, headers: request.headers } as unknown as Parameters<typeof logAudit>[0],
    'delete',
    'members',
    memberId,
    'self-service deletion (§8.5)',
  );

  const response = NextResponse.json({ ok: true });
  clearMemberSession(response);
  return response;
}
