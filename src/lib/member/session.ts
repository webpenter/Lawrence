import { jwtVerify, SignJWT } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';

import { getPayloadClient } from '@/lib/db';
import type { Member } from '@/payload-types';

/**
 * §8.5/§8.6 — member session plumbing for the /api/member/* and /api/secure/*
 * routes. Payload's own cookie (`payload-token`, HS256 over PAYLOAD_SECRET)
 * is the session; these helpers authenticate a request to an ACTIVE member,
 * and mint that cookie for the passwordless paths (magic link, post-TOTP)
 * where payload.login() cannot be used.
 */

export async function memberFromRequest(request: NextRequest): Promise<Member | null> {
  try {
    const payload = await getPayloadClient();
    const { user } = await payload.auth({ headers: request.headers });
    if (!user || (user as { collection?: string }).collection !== 'members') return null;
    const member = user as unknown as Member;
    if (member.status !== 'active') return null;
    return member;
  } catch {
    return null;
  }
}

const SESSION_SECONDS = 60 * 60 * 24 * 14; // mirrors auth.tokenExpiration

/** Mint the same JWT shape Payload issues at login, and set its cookie. */
export async function setMemberSession(response: NextResponse, member: Member): Promise<void> {
  const secret = new TextEncoder().encode(process.env.PAYLOAD_SECRET ?? '');
  const token = await new SignJWT({
    id: member.id,
    collection: 'members',
    email: member.email,
    // Payload includes session id claims when sessions are enabled; the
    // stateless-JWT strategy validates on (id, collection, exp) alone.
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_SECONDS)
    .sign(secret);

  response.cookies.set('payload-token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
}

export function clearMemberSession(response: NextResponse): void {
  response.cookies.set('payload-token', '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Short-lived signed challenge carried between password step and TOTP step. */
export async function createTotpChallenge(memberId: number | string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.PAYLOAD_SECRET ?? '');
  return new SignJWT({ memberId: String(memberId), purpose: 'totp-challenge' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret);
}

export async function verifyTotpChallenge(raw: string): Promise<string | null> {
  try {
    const secret = new TextEncoder().encode(process.env.PAYLOAD_SECRET ?? '');
    const { payload } = await jwtVerify(raw, secret);
    if (payload.purpose !== 'totp-challenge' || typeof payload.memberId !== 'string') return null;
    return payload.memberId;
  } catch {
    return null;
  }
}
