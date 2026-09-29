import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
 * never confirm that an asset exists. Locally (no R2 configured) files stream
 * from the collection's staticDir; when R2 is configured (payload.config.ts's
 * r2Configured), Payload writes uploads there instead of disk, so reads come
 * from R2 too via the same credentials.
 */

function r2Client(): S3Client | null {
  const accountId = process.env['R2_ACCOUNT_ID'];
  const accessKeyId = process.env['R2_ACCESS_KEY_ID'];
  const secretAccessKey = process.env['R2_SECRET_ACCESS_KEY'];
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

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

  const type =
    asset.mimeType ?? CONTENT_TYPES[path.extname(asset.filename).toLowerCase()] ?? 'application/octet-stream';
  const disposition = kind === 'document' ? 'attachment' : 'inline';
  const headers = {
    'Content-Type': type,
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, noimageindex',
    'Content-Disposition': disposition,
  };

  const s3 = r2Client();
  const bucket = process.env['R2_BUCKET'];
  if (s3 && bucket) {
    const prefix = collection; // matches the S3 adapter's default per-collection key prefix
    try {
      const object = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: `${prefix}/${asset.filename}` }),
      );
      if (!object.Body) return notFound();
      return new NextResponse(object.Body.transformToWebStream(), {
        status: 200,
        headers: {
          ...headers,
          ...(object.ContentLength != null
            ? { 'Content-Length': String(object.ContentLength) }
            : {}),
        },
      });
    } catch {
      return notFound();
    }
  }

  const staticDir =
    payload.collections[collection]?.config.upload?.staticDir ??
    path.resolve(process.cwd(), collection);
  const filePath = path.join(staticDir, asset.filename);
  // Defence in depth: the filename must resolve inside the static dir.
  if (!filePath.startsWith(path.resolve(staticDir)) || !existsSync(filePath)) return notFound();

  const size = statSync(filePath).size;
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new NextResponse(stream, {
    status: 200,
    headers: { ...headers, 'Content-Length': String(size) },
  });
}
