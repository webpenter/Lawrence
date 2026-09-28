import { NextResponse, type NextRequest } from 'next/server';

import { getPayloadClient } from '@/lib/db';
import { getDailyRatesPerEur } from '@/lib/fx';

// §6.7 FxSnapshot: record the daily ECB reference rates actually used for
// priceEur, one auditable row per calendar day. Idempotent — re-runs update
// the same date's row.
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const payload = await getPayloadClient().catch(() => null);
  if (!payload) return NextResponse.json({ ok: false }, { status: 503 });

  const date = new Date().toISOString().slice(0, 10);
  const ratesPerEur = await getDailyRatesPerEur();

  const existing = await payload.find({
    collection: 'fx-snapshots',
    where: { date: { equals: date } },
    limit: 1,
    overrideAccess: true,
  });

  if (existing.docs[0]) {
    await payload.update({
      collection: 'fx-snapshots',
      id: existing.docs[0].id,
      data: { ratesPerEur },
      overrideAccess: true,
    });
  } else {
    await payload.create({
      collection: 'fx-snapshots',
      overrideAccess: true,
      data: { date, ratesPerEur, source: 'frankfurter/ecb' },
    });
  }

  return NextResponse.json({ ok: true, date, ratesPerEur });
}
