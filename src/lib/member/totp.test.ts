import { describe, expect, it } from 'vitest';

import { generateTotpSecret, totpCode, totpUri, verifyTotp } from './totp';

describe('TOTP (§8.5 optional 2FA) — RFC 6238', () => {
  // RFC 6238 test vector adapted: secret "12345678901234567890" in base32.
  const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  it('produces the RFC 6238 SHA-1 reference codes', () => {
    // T = 59s → counter 1 → "94287082" (8-digit); our 6-digit tail is "287082".
    expect(totpCode(RFC_SECRET, 59_000)).toBe('287082');
    // T = 1111111109 → "07081804" → 6-digit "081804".
    expect(totpCode(RFC_SECRET, 1_111_111_109_000)).toBe('081804');
  });

  it('verifies the current code and ±1 step of drift, nothing further', () => {
    const now = 1_700_000_000_000;
    const code = totpCode(RFC_SECRET, now);
    expect(verifyTotp(RFC_SECRET, code, now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, code, now + 30_000)).toBe(true);
    expect(verifyTotp(RFC_SECRET, code, now + 61_000)).toBe(false);
  });

  it('rejects malformed codes without throwing', () => {
    expect(verifyTotp(RFC_SECRET, '')).toBe(false);
    expect(verifyTotp(RFC_SECRET, 'abcdef')).toBe(false);
    expect(verifyTotp(RFC_SECRET, '12345')).toBe(false);
  });

  it('generates distinct base32 secrets and a scannable otpauth URI', () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Z2-7]{32}$/);
    const uri = totpUri(a, 'member@example.com', 'Lawrence Private Collection');
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain(`secret=${a}`);
    expect(uri).toContain('digits=6');
  });
});
