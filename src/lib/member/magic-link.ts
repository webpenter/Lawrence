import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * §2.3/§8.5 — "email + password, or a magic link". The link carries an HMAC
 * token over (email, expiry) valid for 15 minutes; redeeming it (the
 * /api/member/magic-link routes, Prompt 9) logs the member in and counts as
 * email confirmation — clicking a link at the address IS the verification.
 */

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

function secret(): string {
  const value = process.env.MAGIC_LINK_SECRET || process.env.PAYLOAD_SECRET;
  if (!value) throw new Error('MAGIC_LINK_SECRET (or PAYLOAD_SECRET) must be set');
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createMagicLinkToken(email: string, now: number = Date.now()): string {
  const payload = `${email.toLowerCase().trim()}.${now + MAGIC_LINK_TTL_MS}`;
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}

export interface MagicLinkResult {
  ok: boolean;
  email?: string;
}

export function verifyMagicLinkToken(raw: string, now: number = Date.now()): MagicLinkResult {
  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return { ok: false };

  let payload: string;
  try {
    payload = Buffer.from(raw.slice(0, dot), 'base64url').toString('utf8');
  } catch {
    return { ok: false };
  }

  const expected = sign(payload);
  const a = Buffer.from(raw.slice(dot + 1));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };

  const at = payload.lastIndexOf('.');
  const email = payload.slice(0, at);
  const expiresAt = Number(payload.slice(at + 1));
  if (!email || !email.includes('@') || !Number.isFinite(expiresAt)) return { ok: false };
  if (now > expiresAt) return { ok: false };

  return { ok: true, email };
}
