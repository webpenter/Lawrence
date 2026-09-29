import { NextResponse, type NextRequest } from 'next/server';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

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

  // CSV as text, or XLSX as the raw binary body (?format=xlsx or an .xlsx
  // filename). The first sheet is the import sheet; header row = column names.
  const filename = request.headers.get('x-filename') ?? undefined;
  const isXlsx =
    url.searchParams.get('format') === 'xlsx' || /\.xlsx?$/i.test(filename ?? '');

  let rows: RawRow[];
  if (isXlsx) {
    const buffer = Buffer.from(await request.arrayBuffer());
    if (buffer.length === 0) return NextResponse.json({ ok: false }, { status: 400 });
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
      if (!sheet) throw new Error('empty workbook');
      rows = XLSX.utils
        .sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
        .map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([key, cell]) => [key.trim(), String(cell ?? '')]),
          ),
        );
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: `XLSX parse error: ${String(err)}` },
        { status: 400 },
      );
    }
  } else {
    const csv = await request.text();
    if (!csv.trim()) return NextResponse.json({ ok: false }, { status: 400 });
    const parsed = Papa.parse<RawRow>(csv, { header: true, skipEmptyLines: true });
    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { ok: false, error: parsed.errors[0]?.message ?? 'CSV parse error' },
        { status: 400 },
      );
    }
    rows = parsed.data;
  }

  const summary = await runImport({
    payload,
    agencyId,
    rows,
    dryRun,
    kind: isXlsx ? 'xlsx' : 'csv',
    sourceType: 'csv_import',
    sourceFilename: filename,
  });

  return NextResponse.json({ ok: true, ...summary }, { status: dryRun ? 200 : 201 });
}
