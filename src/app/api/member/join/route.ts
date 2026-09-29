import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getPayloadClient } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { turnstileOk } from '@/lib/security/turnstile';

const joinSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
  name: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  country: z.string().max(2).optional(),
  marketingConsent: z.boolean().optional(),
  preferredLocale: z.enum(['en', 'it', 'fr', 'de', 'es', 'ru']).optional(),
  source: z.enum(['organic', 'off_market_cta', 'report_download', 'enquiry', 'referral']).optional(),
  turnstileToken: z.string().max(4000).optional(),
});

/**
 * §8.5 step 1 — Join: two fields and a confirmation click. Rate-limited,
 * Turnstile-verified when configured, created through the local API so the
 * registration hook decides status (active, or pending under the flag).
 * The confirmation email carries /api/member/verify. Success and
 * "email already registered" are indistinguishable — no enumeration.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const limit = checkRateLimit(request, 'member-join', { windowMs: 60 * 60 * 1000, max: 10 });
  if (!limit.success) return rateLimitResponse(limit);

  const body = await request.json().catch(() => null);
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  if (!(await turnstileOk(parsed.data.turnstileToken, ip))) {
    return NextResponse.json({ ok: false, error: 'verification' }, { status: 400 });
  }

  const payload = await getPayloadClient();
  try {
    await payload.create({
      collection: 'members',
      data: {
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.name,
        phone: parsed.data.phone,
        country: parsed.data.country?.toUpperCase(),
        marketingConsent: parsed.data.marketingConsent ?? false,
        preferredLocale: parsed.data.preferredLocale ?? 'en',
        source: parsed.data.source ?? 'organic',
        status: 'active', // the registration hook re-decides this
      },
      overrideAccess: false,
    });
  } catch (err) {
    // A duplicate address surfaces as a ValidationError on `email`; anything
    // else is a real failure. Both exits below stay indistinguishable to the
    // caller for the duplicate case.
    const message = err instanceof Error ? err.message : '';
    const detail = JSON.stringify((err as { data?: unknown }).data ?? {});
    const isDuplicate = /already|registered|duplicate|unique|invalid: email|"email"/i.test(
      `${message} ${detail}`,
    );
    if (!isDuplicate) {
      console.error('[member-join] create failed:', err);
      return NextResponse.json({ ok: false, error: 'failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, requiresVerification: true });
}
