import { NextResponse, type NextRequest } from 'next/server';
import Papa from 'papaparse';

import { getPayloadClient } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { runImport } from '@/lib/import/runner';
import type { RawRow } from '@/lib/import/validate-row';
import { relationId, staffUser } from '@/payload/access/tenant';

// §8.4 bulk import: upload → dry-run report → confirm → import. Auth is the
// Payload session/API key; agency users import only into their own agency.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const limitResult = checkRateLimit(request, 'import', { windowMs: 60 * 60 * 1000, max: 10 });
  if (!limitResult.success) {
    return rateLimitResponse(limitResult);
  }

  const payload = await getPayloadClient().catch(() => null);
  if (!payload) return NextResponse.json({ ok: false }, { status: 503 });

  const { user } = await payload.auth({ headers: request.headers });
  const staff = staffUser(user);
  if (!staff || !['admin', 'agency_admin'].includes(staff.role ?? '')) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dryRun') !== 'false';
  const requestedAgency = Number(url.searchParams.get('agency') ?? '');
  const ownAgency = relationId(staff.agency ?? null);
  const agencyId =
    staff.role === 'admin'
      ? Number.isFinite(requestedAgency) && requestedAgency > 0
        ? requestedAgency
        : ownAgency
      : ownAgency;
  if (!agencyId) {
    return NextResponse.json({ ok: false, error: 'agency required' }, { status: 400 });
  }

  const csv = await request.text();
  if (!csv.trim()) return NextResponse.json({ ok: false }, { status: 400 });

  const parsed = Papa.parse<RawRow>(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return NextResponse.json(
      { ok: false, error: parsed.errors[0]?.message ?? 'CSV parse error' },
      { status: 400 },
    );
  }

  const summary = await runImport({
    payload,
    agencyId,
    rows: parsed.data,
    dryRun,
    kind: 'csv',
    sourceType: 'csv_import',
    sourceFilename: request.headers.get('x-filename') ?? undefined,
  });

  return NextResponse.json({ ok: true, ...summary }, { status: dryRun ? 200 : 201 });
}
