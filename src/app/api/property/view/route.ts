import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getPayloadClient } from '@/lib/db';

// Server-side view counter (§10.3): session-deduplicated via a cookie listing
// seen ids, never blocking render (the page fires this from a beacon), and
// short-circuiting every heavy Property hook via context.viewBeacon.

const schema = z.object({ id: z.number().int().positive() });
const COOKIE = 'lpc_seen';
const MAX_TRACKED = 50;

export async function POST(request: NextRequest): Promise<NextResponse> {
  let id: number;
  try {
    ({ id } = schema.parse(await request.json()));
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const seen = (request.cookies.get(COOKIE)?.value ?? '')
    .split('.')
    .filter(Boolean)
    .map(Number);

  if (seen.includes(id)) {
    return NextResponse.json({ ok: true, deduplicated: true });
  }

  try {
    const payload = await getPayloadClient();
    const property = await payload.findByID({
      collection: 'properties',
      id,
      depth: 0,
      overrideAccess: true,
    });
    await payload.update({
      collection: 'properties',
      id,
      overrideAccess: true,
      context: { viewBeacon: true },
      data: { viewCount: (property.viewCount ?? 0) + 1 },
    });
  } catch (err) {
    // A failed count must never surface to the visitor.
    console.error('[view-counter] increment failed:', err);
  }

  const response = NextResponse.json({ ok: true });
  const updated = [...seen.slice(-(MAX_TRACKED - 1)), id].join('.');
  response.cookies.set(COOKIE, updated, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    // Session cookie: dedup per browsing session (§10.3).
  });
  return response;
}
