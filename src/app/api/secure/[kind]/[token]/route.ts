import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

import { NextResponse, type NextRequest } from 'next/server';

import { getPayloadClient } from '@/lib/db';
import {
  createMemoryNonceStore,
  SIGNED_URL_TTL_MS,
  verifySignedAssetToken,
} from '@/lib/media/signed-url';
import { memberFromRequest } from '@/lib/member/session';

/**
 * §8.6 — the private-bucket door. Member media and documents are served ONLY
 * through here: HMAC token (15-minute lifetime), the session re-checked
 * server-side, the nonce burned, `Cache-Control: private, no-store`,
 * `X-Robots-Tag: noindex, noimageindex`. Every failure is the same 404 —
 * never confirm that an asset exists. Locally files stream from the
 * collection's staticDir; in production this maps to the private bucket.
 */

// One store per server process; production swaps in Upstash (Prompt 14).
const nonceStore = createMemoryNonceStore();

function notFound(): NextResponse {
  return new NextResponse(null, {
    status: 404,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, noimageindex',
    },
  });
}

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string; token: string }> },
): Promise<NextResponse> {
  const { kind, token } = await params;
  if (kind !== 'media' && kind !== 'document') return notFound();

  const verified = verifySignedAssetToken(token);
  if (!verified.ok || !verified.token || verified.token.kind !== kind) return notFound();

  // Session re-check: the token's member must BE the requester, and active.
  const member = await memberFromRequest(request);
  if (!member || String(member.id) !== verified.token.memberId) return notFound();

  // Single use.
  if (!(await nonceStore.burn(verified.token.nonce, SIGNED_URL_TTL_MS))) return notFound();

  const payload = await getPayloadClient();
  const collection = kind === 'media' ? 'media' : 'documents';
  const asset = await payload
    .findByID({ collection, id: verified.token.assetId, overrideAccess: true, depth: 0 })
    .catch(() => null);
  if (!asset?.filename) return notFound();

  const staticDir =
    payload.collections[collection]?.config.upload?.staticDir ??
    path.resolve(process.cwd(), collection);
  const filePath = path.join(staticDir, asset.filename);
  // Defence in depth: the filename must resolve inside the static dir.
  if (!filePath.startsWith(path.resolve(staticDir)) || !existsSync(filePath)) return notFound();

  const size = statSync(filePath).size;
  const type =
    asset.mimeType ?? CONTENT_TYPES[path.extname(asset.filename).toLowerCase()] ?? 'application/octet-stream';

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': type,
      'Content-Length': String(size),
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, noimageindex',
      'Content-Disposition': kind === 'document' ? 'attachment' : 'inline',
    },
  });
}
