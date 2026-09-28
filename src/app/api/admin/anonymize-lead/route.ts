import { staffUser } from '@/payload/access/tenant';
import { NextResponse, type NextRequest } from 'next/server';
import { anonymizeLead } from '@/lib/privacy/anonymize';
import { getPayloadClient } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const limitResult = checkRateLimit(request, 'anonymize', { windowMs: 60000, max: 10 });
  if (!limitResult.success) {
    return rateLimitResponse(limitResult);
  }

  try {
    const body = await request.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json({ ok: false, error: 'leadId is required' }, { status: 400 });
    }

    const payload = await getPayloadClient();
    // Admin session only (§16.4 one-click action) — the retention cron has its
    // own CRON_SECRET-guarded route; no bearer shortcut here.
    const { user } = await payload.auth({ headers: request.headers });
    if (!user || !['admin', 'editor'].includes(staffUser(user)?.role ?? '')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const result = await anonymizeLead(leadId, user);
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    console.error('[anonymize-lead] API error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Anonymization failed' },
      { status: 500 },
    );
  }
}
