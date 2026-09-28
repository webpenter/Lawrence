import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * §8.6 — signed URLs for the private bucket. Member-only media and documents
 * are served through /api/secure/[kind]/[token] where the token is an HMAC
 * over (assetId, memberId, expiry, nonce) with a 15-minute lifetime. The
 * session is re-checked server-side on redemption and the nonce is burned
 * (Redis in production; the store is injected so tests and local dev run
 * without it). An invalid or expired token is a 404, never a 403 — the
 * existence of an asset is itself confidential.
 */

export const SIGNED_URL_TTL_MS = 15 * 60 * 1000;

export type SecureAssetKind = 'media' | 'document';

export interface SignedAssetToken {
  kind: SecureAssetKind;
  assetId: string;
  memberId: string;
  expiresAt: number;
  nonce: string;
}

function secret(): string {
  const value = process.env.SIGNED_URL_SECRET || process.env.PAYLOAD_SECRET;
  if (!value) throw new Error('SIGNED_URL_SECRET (or PAYLOAD_SECRET) must be set');
  return value;
}

function payloadOf(token: Omit<SignedAssetToken, 'nonce'> & { nonce: string }): string {
  return [token.kind, token.assetId, token.memberId, token.expiresAt, token.nonce].join('.');
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

/** Mint a token for one member + one asset, valid for 15 minutes. */
export function createSignedAssetToken(
  kind: SecureAssetKind,
  assetId: string | number,
  memberId: string | number,
  now: number = Date.now(),
): string {
  const token: SignedAssetToken = {
    kind,
    assetId: String(assetId),
    memberId: String(memberId),
    expiresAt: now + SIGNED_URL_TTL_MS,
    nonce: randomBytes(12).toString('base64url'),
  };
  const payload = payloadOf(token);
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}

export interface VerifyResult {
  ok: boolean;
  token?: SignedAssetToken;
}

/**
 * Verify signature + expiry and parse. Constant-time comparison; any
 * malformed input is simply { ok: false } — callers translate that to 404.
 * Nonce burning happens separately (burnNonce) AFTER the session re-check.
 */
export function verifySignedAssetToken(
  raw: string,
  now: number = Date.now(),
): VerifyResult {
  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return { ok: false };
  const encodedPayload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);

  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
  } catch {
    return { ok: false };
  }

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };

  const [kind, assetId, memberId, expiresAtRaw, nonce] = payload.split('.');
  const expiresAt = Number(expiresAtRaw);
  if (!kind || !assetId || !memberId || !nonce || !Number.isFinite(expiresAt)) {
    return { ok: false };
  }
  if (kind !== 'media' && kind !== 'document') return { ok: false };
  if (now > expiresAt) return { ok: false };

  return { ok: true, token: { kind, assetId, memberId, expiresAt, nonce } };
}

/** Single-use enforcement: true the first time, false ever after. */
export interface NonceStore {
  burn(nonce: string, ttlMs: number): Promise<boolean>;
}

/**
 * In-memory store for local dev and tests. Production injects an Upstash
 * Redis implementation (Prompt 9) — a serverless deployment cannot rely on
 * process memory.
 */
export function createMemoryNonceStore(now: () => number = Date.now): NonceStore {
  const burned = new Map<string, number>();
  return {
    async burn(nonce, ttlMs) {
      const t = now();
      for (const [key, expiry] of burned) {
        if (expiry < t) burned.delete(key);
      }
      if (burned.has(nonce)) return false;
      burned.set(nonce, t + ttlMs);
      return true;
    },
  };
}
