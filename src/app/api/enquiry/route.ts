import { NextResponse, type NextRequest } from 'next/server';
import { render } from '@react-email/components';

import { brand } from '@/config/brand';
import { getPayloadClient } from '@/lib/db';
import { sendEmail } from '@/lib/email/send';
import {
  LeadConfirmationEmail,
  LeadToAgencyEmail,
} from '@/lib/email/templates/lead-emails';
import { resolveLeadRecipients } from '@/lib/leads/routing';
import { memberFromRequest } from '@/lib/member/session';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { leadSchema, MIN_FILL_MS, type LeadInput } from '@/lib/schemas/lead';
import { requestIp, turnstileOk } from '@/lib/security/turnstile';
import type { Agency, Agent } from '@/payload-types';

// §22-11A enquiry intake: validate (shared Zod schema), Turnstile, rate-limit
// 5/IP/hour, drop bots silently (honeypot + timing check), store with the
// consent record, UTM and — when authenticated — the memberId. Routing is
// desk-first, then the listing agent (agency inbox as fallback), via Resend
// from our domain with reply-to the enquirer. Sample listings log the enquiry
// but never email anyone.

function isBot(parsed: LeadInput): boolean {
  if (parsed.website !== undefined && parsed.website !== '') return true;
  if (parsed.startedAt !== undefined && Date.now() - parsed.startedAt < MIN_FILL_MS) return true;
  return false;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = requestIp(request) || 'unknown';
  const limitResult = checkRateLimit(request, 'enquiry', { windowMs: 60 * 60 * 1000, max: 5 });
  if (!limitResult.success) {
    return rateLimitResponse(limitResult);
  }

  let parsed: LeadInput;
  try {
    parsed = leadSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Bots get a success response and nothing stored.
  if (isBot(parsed)) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (!(await turnstileOk(parsed.turnstileToken, ip))) {
    return NextResponse.json({ ok: false, error: 'verification' }, { status: 400 });
  }

  try {
    const payload = await getPayloadClient();
    const member = await memberFromRequest(request);

    let propertyId: number | undefined;
    let agencyId: number | undefined;
    let agentId: number | undefined;
    let listingTitle: string | undefined;
    let listingUrl: string | undefined;
    let isSample = false;
    let agent: Agent | null = null;
    let agency: Agency | null = null;

    if (parsed.propertyId != null) {
      const property = await payload.findByID({
        collection: 'properties',
        id: parsed.propertyId,
        depth: 1,
        overrideAccess: true,
      });
      propertyId = property.id;
      listingTitle = property.title;
      isSample = Boolean(property.isSample);
      if (property.slug) {
        const base = (process.env.NEXT_PUBLIC_SITE_URL ?? brand.siteUrl).replace(/\/$/, '');
        listingUrl = `${base}/${parsed.locale ?? 'en'}/property/${property.slug}`;
      }
      agency = typeof property.agency === 'object' ? property.agency : null;
      agencyId = typeof property.agency === 'object' ? property.agency.id : property.agency;
      agent = typeof property.agent === 'object' ? property.agent : null;
      agentId = agent?.id ?? (typeof property.agent === 'number' ? property.agent : undefined);
    }

    // Desk first, then the listing agent (agency inbox as fallback) — §2054.
    const recipients = resolveLeadRecipients({
      agentEmail: agent?.email,
      agentReceivesLeads: agent?.receivesLeads,
      agencyEmail: agency?.email,
      internalDesk: process.env.LEAD_NOTIFY_TO,
    });

    let routed = false;
    if (!isSample) {
      const component = LeadToAgencyEmail({
        enquirerName: parsed.name,
        enquirerEmail: parsed.email,
        enquirerPhone: parsed.phone,
        message: parsed.message,
        listingTitle,
        listingUrl,
      });
      const html = await render(component);
      const text = await render(component, { plainText: true });
      for (const recipient of recipients) {
        const sent = await sendEmail({
          to: recipient.to,
          subject: listingTitle
            ? `New enquiry — ${listingTitle}`
            : `New ${parsed.source} enquiry`,
          html,
          text,
          replyTo: parsed.email,
        });
        routed = routed || sent;
      }

      const confirmation = LeadConfirmationEmail({
        enquirerName: parsed.name,
        enquirerEmail: parsed.email,
        listingTitle,
        listingUrl,
      });
      await sendEmail({
        to: parsed.email,
        subject: 'Your enquiry has been sent',
        html: await render(confirmation),
        text: await render(confirmation, { plainText: true }),
      });
    }

    await payload.create({
      collection: 'enquiries',
      overrideAccess: true,
      data: {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        message: parsed.message,
        property: propertyId,
        agency: agencyId,
        agent: agentId,
        member: member?.id,
        locale: parsed.locale,
        source: parsed.source,
        // Lifecycle (§6.6): 'sent' once a routing notification went out.
        status: routed ? 'sent' : 'new',
        utm: parsed.utm && Object.keys(parsed.utm).length > 0 ? parsed.utm : undefined,
        consent: {
          consentMarketing: true,
          consentedAt: new Date().toISOString(),
          consentIp: ip,
        },
      },
    });

    // §8.7: authenticated enquiries land on the member's activity trail.
    if (member) {
      await payload
        .create({
          collection: 'member-activity',
          overrideAccess: true,
          data: {
            member: member.id,
            action: 'enquiry',
            property: propertyId,
            at: new Date().toISOString(),
            ip,
          },
        })
        .catch(() => undefined);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.warn('[enquiry] intake failed:', err);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
