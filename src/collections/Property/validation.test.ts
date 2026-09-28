import { describe, expect, it } from 'vitest';

import { checkAdmission, checkPrimeCap } from './validation';

describe('checkAdmission (spec §2.2 — the €20M rule)', () => {
  it('blocks publishing with no enforceable value at all', () => {
    const result = checkAdmission({});
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/internal value/i);
  });

  it('admits €20M exactly as trophy', () => {
    expect(checkAdmission({ priceEur: 20_000_000 })).toEqual({ ok: true, derivedTier: 'trophy' });
  });

  it('admits €50M and above as signature', () => {
    expect(checkAdmission({ priceEur: 50_000_000 }).derivedTier).toBe('signature');
    expect(checkAdmission({ priceEur: 180_000_000 }).derivedTier).toBe('signature');
  });

  it('blocks €10–20M without the explicit prime override', () => {
    const result = checkAdmission({ priceEur: 15_000_000 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/prime/i);
  });

  it('admits €10–20M when valueTier=prime was explicitly chosen', () => {
    expect(checkAdmission({ priceEur: 15_000_000, valueTier: 'prime' })).toEqual({
      ok: true,
      derivedTier: 'prime',
    });
  });

  it('never admits below €10M, even with the prime override', () => {
    const result = checkAdmission({ priceEur: 9_999_999, valueTier: 'prime' });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/€10M/);
  });

  it('enforces on internalValueEur for on-request listings, preferring it over priceEur', () => {
    // Public price hidden, internal value below threshold: blocked.
    expect(checkAdmission({ internalValueEur: 12_000_000 }).ok).toBe(false);
    // Internal value is authoritative even when a (stale) priceEur exists.
    expect(
      checkAdmission({ internalValueEur: 12_000_000, priceEur: 25_000_000 }).ok,
    ).toBe(false);
    expect(checkAdmission({ internalValueEur: 26_000_000 }).derivedTier).toBe('trophy');
  });

  it('prime never auto-derives for a €30M listing marked prime by mistake', () => {
    // The value implies trophy; derivation corrects the tier upward.
    expect(checkAdmission({ priceEur: 30_000_000, valueTier: 'prime' }).derivedTier).toBe('trophy');
  });
});

describe('checkPrimeCap (spec §2.2 — 10% of published inventory)', () => {
  it('allows the first prime listing on an empty site (floor of one)', () => {
    expect(checkPrimeCap(0, 0).ok).toBe(true);
  });

  it('allows one prime among ten published listings', () => {
    expect(checkPrimeCap(0, 10).ok).toBe(true);
  });

  it('blocks a second prime among ten published listings', () => {
    const result = checkPrimeCap(1, 10);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/capped at 10%/);
  });

  it('allows four primes among forty-four published listings and blocks the fifth', () => {
    expect(checkPrimeCap(3, 44).ok).toBe(true);
    expect(checkPrimeCap(4, 44).ok).toBe(false);
  });
});
