import { beforeAll, describe, expect, it } from 'vitest';

import { createMagicLinkToken, MAGIC_LINK_TTL_MS, verifyMagicLinkToken } from './magic-link';

beforeAll(() => {
  process.env.MAGIC_LINK_SECRET = 'test_secret_for_magic_links_1234567890';
});

describe('magic-link tokens (§2.3 — email + password, or a magic link)', () => {
  it('round-trips and normalises the email', () => {
    const now = 1_700_000_000_000;
    const raw = createMagicLinkToken('  Member@Example.COM ', now);
    const result = verifyMagicLinkToken(raw, now + 1);
    expect(result).toEqual({ ok: true, email: 'member@example.com' });
  });

  it('expires after 15 minutes', () => {
    const now = 1_700_000_000_000;
    const raw = createMagicLinkToken('member@example.com', now);
    expect(verifyMagicLinkToken(raw, now + MAGIC_LINK_TTL_MS + 1).ok).toBe(false);
  });

  it('rejects tampered and malformed tokens', () => {
    const now = 1_700_000_000_000;
    const raw = createMagicLinkToken('member@example.com', now);
    const forgedPayload = Buffer.from(`attacker@example.com.${now + MAGIC_LINK_TTL_MS}`).toString(
      'base64url',
    );
    expect(
      verifyMagicLinkToken(`${forgedPayload}.${raw.slice(raw.lastIndexOf('.') + 1)}`, now).ok,
    ).toBe(false);
    expect(verifyMagicLinkToken('', now).ok).toBe(false);
    expect(verifyMagicLinkToken('abc.def', now).ok).toBe(false);
  });
});
