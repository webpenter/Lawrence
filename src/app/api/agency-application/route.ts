import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getPayloadClient } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { MIN_FILL_MS } from '@/lib/schemas/lead';
import { requestIp, turnstileOk } from '@/lib/security/turnstile';

const applicationSchema = z.object({
  agencyName: z.string().min(2).max(200),
  contactName: z.string().min(2).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(50).optional(),
  country: z.string().max(2).optional(),
  website: z.string().url().max(500).optional().or(z.literal('')),
  inventoryNote: z.string().max(5000).optional(),
  consent: z.literal(true),
  website_hp: z.string().max(0).optional(),
  startedAt: z.number().int().positive().optional(),
  turnstileToken: z.string().max(4000).optional(),
});

/**
 * §9.4 onboarding step 1 — the /sell application. Same anti-abuse posture
 * as the enquiry intake: rate limit, Turnstile, honeypot, timing check.
 * Applications land in the admin queue; approval is a human decision.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = requestIp(request) || 'unknown';
  const limit = checkRateLimit(request, 'agency-application', {
    windowMs: 60 * 60 * 1000,
    max: 5,
  });
  if (!limit.success) return rateLimitResponse(limit);

  const parsed = applicationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Bots get a success response and nothing stored.
  if (
    (parsed.data.website_hp !== undefined && parsed.data.website_hp !== '') ||
    (parsed.data.startedAt !== undefined && Date.now() - parsed.data.startedAt < MIN_FILL_MS)
  ) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (!(await turnstileOk(parsed.data.turnstileToken, ip))) {
    return NextResponse.json({ ok: false, error: 'verification' }, { status: 400 });
  }

  try {
    const payload = await getPayloadClient();
    await payload.create({
      collection: 'agency-applications',
      overrideAccess: true,
      data: {
        agencyName: parsed.data.agencyName,
        contactName: parsed.data.contactName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        country: parsed.data.country?.toUpperCase(),
        website: parsed.data.website || undefined,
        inventoryNote: parsed.data.inventoryNote,
        status: 'new',
        consentIp: ip,
      } as never,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.warn('[agency-application] intake failed:', err);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
