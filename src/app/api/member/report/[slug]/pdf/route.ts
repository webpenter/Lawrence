import { NextResponse, type NextRequest } from 'next/server';

import { getReportBySlug } from '@/lib/db';
import { createSignedAssetToken } from '@/lib/media/signed-url';
import { memberFromRequest } from '@/lib/member/session';

/**
 * §11.6 — the gated report PDF. Anonymous readers land on /join (the report
 * page is the acquisition asset; the PDF is what converts). Members get a
 * fresh single-use signed URL into /api/secure/document/*, so the file
 * itself is never a public path and nothing signed is ever cached.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const base = new URL(request.url).origin;

  const member = await memberFromRequest(request);
  if (!member) {
    return NextResponse.redirect(`${base}/en/join`, 302);
  }

  try {
    const report = await getReportBySlug(slug);
    const pdf = report?.pdf;
    const pdfId = typeof pdf === 'object' && pdf !== null ? pdf.id : pdf;
    if (!pdfId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const token = createSignedAssetToken('document', pdfId, member.id);
    const response = NextResponse.redirect(`${base}/api/secure/document/${token}`, 302);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}
