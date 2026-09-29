import { NextResponse, type NextRequest } from 'next/server';

import { getPayloadClient } from '@/lib/db';
import { relationId, staffUser } from '@/payload/access/tenant';

/**
 * §9.4 — the downloadable error CSV for an import job. Admin/editor, or the
 * agency_admin of the job's own agency; anyone else gets the same 404.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const { jobId } = await params;
  const payload = await getPayloadClient().catch(() => null);
  if (!payload) return NextResponse.json({ ok: false }, { status: 503 });

  const { user } = await payload.auth({ headers: request.headers });
  const staff = staffUser(user);
  if (!staff) return NextResponse.json({ ok: false }, { status: 404 });

  const job = await payload
    .findByID({ collection: 'import-jobs', id: jobId, depth: 0, overrideAccess: true })
    .catch(() => null);
  if (!job) return NextResponse.json({ ok: false }, { status: 404 });

  const jobAgency = relationId(job.agency as never);
  const allowed =
    staff.role === 'admin' ||
    staff.role === 'editor' ||
    (staff.role === 'agency_admin' && relationId(staff.agency ?? null) === jobAgency);
  if (!allowed) return NextResponse.json({ ok: false }, { status: 404 });

  const reports = (job.errorReport ?? []) as Array<{
    row: number;
    reference?: string | null;
    status: string;
    issues: Array<{ column: string; reason: string; severity: string }>;
  }>;

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = ['row,reference,severity,column,reason'];
  for (const report of reports) {
    for (const issue of report.issues) {
      lines.push(
        [
          String(report.row),
          escape(report.reference ?? ''),
          issue.severity,
          issue.column,
          escape(issue.reason),
        ].join(','),
      );
    }
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="import-${jobId}-errors.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
