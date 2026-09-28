import { NextResponse, type NextRequest } from 'next/server';
import { render } from '@react-email/components';

import { brand } from '@/config/brand';
import { getPayloadClient } from '@/lib/db';
import { sendEmail } from '@/lib/email/send';
import { LeadReminderEmail } from '@/lib/email/templates/lead-emails';
import { needsUnansweredReminder, UNANSWERED_REMINDER_MS } from '@/lib/leads/routing';

export const maxDuration = 300;

// §8.9: a lead sitting in new/sent for 48 h earns the agency one reminder and
// a flag in the admin dashboard (surfaced via the reminderSentAt field).
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const payload = await getPayloadClient().catch(() => null);
  if (!payload) return NextResponse.json({ ok: false }, { status: 503 });

  const now = new Date();
  const threshold = new Date(now.getTime() - UNANSWERED_REMINDER_MS).toISOString();
  const stale = await payload.find({
    collection: 'enquiries',
    where: {
      and: [
        { status: { in: ['new', 'sent'] } },
        { createdAt: { less_than_equal: threshold } },
        { reminderSentAt: { equals: null } },
      ],
    },
    limit: 200,
    depth: 1,
    overrideAccess: true,
  });

  let reminded = 0;
  for (const lead of stale.docs) {
    if (!needsUnansweredReminder(lead, now)) continue;

    const agency = typeof lead.agency === 'object' ? lead.agency : null;
    const property = typeof lead.property === 'object' ? lead.property : null;
    if (agency?.email && !property?.isSample) {
      const base = (process.env.NEXT_PUBLIC_SITE_URL ?? brand.siteUrl).replace(/\/$/, '');
      const component = LeadReminderEmail({
        listingTitle: property?.title,
        enquirerName: lead.name,
        receivedAt: new Date(lead.createdAt).toISOString().slice(0, 10),
        dashboardUrl: `${base}/admin/collections/leads`,
      });
      await sendEmail({
        to: agency.email,
        subject: 'WATERLINE: an enquiry is waiting for a reply',
        html: await render(component),
        text: await render(component, { plainText: true }),
      });
    }

    await payload.update({
      collection: 'enquiries',
      id: lead.id,
      data: { reminderSentAt: now.toISOString() },
      overrideAccess: true,
    });
    reminded += 1;
  }

  return NextResponse.json({ ok: true, scanned: stale.totalDocs, reminded });
}
