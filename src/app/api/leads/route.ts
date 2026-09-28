import { NextResponse, type NextRequest } from 'next/server';
import { render } from '@react-email/components';

import { brand } from '@/config/brand';
import { getPayloadClient } from '@/lib/db';
import { sendEmail } from '@/lib/email/send';
import {
  LeadConfirmationEmail,
  LeadToAgencyEmail,
} from '@/lib/email/templates/lead-emails';
import { resolveLeadRecipient } from '@/lib/leads/routing';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { leadSchema, MIN_FILL_MS, type LeadInput } from '@/lib/schemas/lead';
import type { Agency, Agent } from '@/payload-types';

// §8.9 lead intake: validate (shared Zod schema), rate-limit 5/IP/hour, drop
// bots silently (honeypot + timing check), store with consent record, route
// agent → agency inbox → internal desk, email via Resend from our domain with
// reply-to the enquirer. Sample listings log the lead but never email an
// agency. Rate limiting is enforced via checkRateLimit().

function isBot(parsed: LeadInput): boolean {
  if (parsed.website !== undefined && parsed.website !== '') return true;
  if (parsed.startedAt !== undefined && Date.now() - parsed.startedAt < MIN_FILL_MS) return true;
  return false;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const limitResult = checkRateLimit(request, 'leads', { windowMs: 60 * 60 * 1000, max: 5 });
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

  try {
    const payload = await getPayloadClient();

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

    // §8.9 routing chain: property.agent → agency inbox → internal desk.
    const recipient = resolveLeadRecipient({
      agentEmail: agent?.email,
      agentReceivesLeads: agent?.receivesLeads,
      agencyEmail: agency?.email,
      internalDesk: process.env.LEAD_NOTIFY_TO,
    });

    let agencyEmailed = false;
    if (recipient && !isSample) {
      const component = LeadToAgencyEmail({
        enquirerName: parsed.name,
        enquirerEmail: parsed.email,
        enquirerPhone: parsed.phone,
        message: parsed.message,
        listingTitle,
        listingUrl,
      });
      agencyEmailed = await sendEmail({
        to: recipient.to,
        subject: listingTitle
          ? `New enquiry — ${listingTitle}`
          : `New ${parsed.source} enquiry`,
        html: await render(component),
        text: await render(component, { plainText: true }),
        replyTo: parsed.email,
      });
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
        locale: parsed.locale,
        source: parsed.source,
        // Lifecycle (§6.8): 'sent' once the agency notification went out.
        status: agencyEmailed ? 'sent' : 'new',
        consent: {
          consentMarketing: true,
          consentedAt: new Date().toISOString(),
          consentIp: ip,
        },
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.warn('[leads] intake failed:', err);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
