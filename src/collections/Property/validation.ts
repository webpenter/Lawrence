import {
  ADMISSION_FLOOR_EUR,
  PRIME_CAP_RATIO,
  PRIME_FLOOR_EUR,
  type ValueTier,
} from './enums';

export interface AdmissionInput {
  /** Best EUR value available for enforcement: internalValueEur ?? priceEur. */
  internalValueEur?: number | null;
  priceEur?: number | null;
  valueTier?: ValueTier | null;
}

export interface AdmissionResult {
  ok: boolean;
  /** The tier the value implies (trophy/signature auto-derive; prime never auto-derives). */
  derivedTier?: ValueTier;
  reason?: string;
}

/**
 * The admission policy (spec §2.2, CLAUDE.md): Lawrence lists property from
 * €20M. Listings priced "on request" still carry an admin-only internalValueEur
 * so the threshold can be enforced. €10–20M publishes ONLY as valueTier=prime —
 * an explicit admin decision, never a derivation. Below €10M never publishes.
 */
export function checkAdmission(input: AdmissionInput): AdmissionResult {
  const value = input.internalValueEur ?? input.priceEur ?? null;

  if (value == null || Number.isNaN(value)) {
    return {
      ok: false,
      reason:
        'Cannot publish: no enforceable value. Set a price, or for "price on request" set the admin-only internal value (EUR).',
    };
  }

  if (value >= 50_000_000) return { ok: true, derivedTier: 'signature' };
  if (value >= ADMISSION_FLOOR_EUR) return { ok: true, derivedTier: 'trophy' };

  if (value >= PRIME_FLOOR_EUR) {
    if (input.valueTier === 'prime') return { ok: true, derivedTier: 'prime' };
    return {
      ok: false,
      reason: `Cannot publish: €${Math.round(value / 1_000_000)}M is below the €20M threshold. €10–20M may publish only on the prime exception track — an explicit admin decision (set valueTier to prime), capped at 10% of published inventory.`,
    };
  }

  return {
    ok: false,
    reason: `Cannot publish: €${Math.round(value / 1_000_000)}M is below the €10M prime floor. Lawrence lists property from €20M (prime exception from €10M).`,
  };
}

/**
 * The prime cap (§2.2): prime is at most 10% of published inventory, with a
 * floor of one so the very first prime listing on an empty site is possible.
 * `publishedTotal`/`publishedPrime` EXCLUDE the listing being published.
 */
export function checkPrimeCap(publishedPrime: number, publishedTotal: number): AdmissionResult {
  const cap = Math.max(1, Math.floor(PRIME_CAP_RATIO * (publishedTotal + 1)));
  if (publishedPrime + 1 > cap) {
    return {
      ok: false,
      reason: `Cannot publish: the prime exception track is capped at 10% of published inventory (${publishedPrime} of cap ${cap} already published). Retire a prime listing or grow the inventory first.`,
    };
  }
  return { ok: true };
}
