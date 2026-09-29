import { NextResponse, type NextRequest } from 'next/server';
import { render } from '@react-email/components';
import { z } from 'zod';

import { brand } from '@/config/brand';
import { getPayloadClient } from '@/lib/db';
import { sendEmail } from '@/lib/email/send';
import { ModerationOutcomeEmail } from '@/lib/email/templates/agency-emails';
import { logAudit } from '@/lib/audit';
import { staffUser } from '@/payload/access/tenant';

const decisionSchema = z.object({
  propertyId: z.number().int().positive(),
  action: z.enum(['approve', 'request_changes', 'reject']),
  note: z.string().max(2000).optional(),
});

/**
 * §9.4 — the review-queue decision. Approve publishes (the §8.4/§2.2 hooks
 * still gate it — an inadmissible listing throws and nothing changes);
 * request-changes and reject write the note that reaches the agency, and the
 * outcome email goes to the agency inbox.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const payload = await getPayloadClient();
  const { user } = await payload.auth({ headers: request.headers });
  const staff = staffUser(user);
  if (!staff || (staff.role !== 'admin' && staff.role !== 'editor')) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { propertyId, action, note } = parsed.data;

  try {
    const moderation =
      action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'changes_requested';
    const updated = await payload.update({
      collection: 'properties',
      id: propertyId,
      overrideAccess: true,
      data: {
        moderation,
        moderationNote: note ?? undefined,
        ...(action === 'approve' ? { status: 'available', _status: 'published' } : {}),
      } as never,
      depth: 1,
    });

    await logAudit(
      { payload, user } as never,
      'update',
      'properties',
      propertyId,
      `Review: ${action}${note ? ` — ${note.slice(0, 120)}` : ''}`,
    );

    // The note reaches the agency (§9.4) — best-effort, never blocks the decision.
    const agency = typeof updated.agency === 'object' ? updated.agency : null;
    if (agency?.email) {
      const base = (process.env.NEXT_PUBLIC_SITE_URL ?? brand.siteUrl).replace(/\/$/, '');
      const component = ModerationOutcomeEmail({
        listingTitle: updated.title,
        outcome: moderation as 'approved' | 'changes_requested' | 'rejected',
        note,
        dashboardUrl: `${base}/admin/collections/properties/${propertyId}`,
      });
      await sendEmail({
        to: agency.email,
        subject:
          moderation === 'approved'
            ? `Listing approved — ${updated.title}`
            : moderation === 'changes_requested'
              ? `Changes requested — ${updated.title}`
              : `Listing not approved — ${updated.title}`,
        html: await render(component),
        text: await render(component, { plainText: true }),
      }).catch(() => undefined);
    }

    return NextResponse.json({ ok: true, moderation });
  } catch (err) {
    const message =
      err instanceof Error && /Cannot publish/.test(err.message)
        ? err.message
        : 'Decision failed.';
    console.warn('[review] decision failed:', err);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
