import type { Currency } from '@/collections/Property/enums';

export type FxRates = Record<Currency, number>;

/**
 * Units of each currency per 1 EUR. Used as the offline fallback when the FX
 * fetch fails; refreshed rates overwrite these at runtime. AED is pegged to
 * the USD (3.6725/USD) and is not published by the ECB, so its fallback is
 * derived and only ever replaced by another source if one is configured.
 * Snapshot dated 2026-09-21 (approximate — the daily fetch is the source of truth).
 */
export const FALLBACK_RATES_PER_EUR: FxRates = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.85,
  CHF: 0.94,
  AED: 3.97,
  SGD: 1.45,
  HKD: 8.42,
};

/**
 * Convert an amount in `currency` to EUR using `ratesPerEur` (units per 1 EUR).
 * priceEur is the only field ever used for sorting and range filters (spec §6.2).
 */
export function convertToEur(
  amount: number,
  currency: Currency,
  ratesPerEur: FxRates = FALLBACK_RATES_PER_EUR,
): number {
  const rate = ratesPerEur[currency];
  if (!rate || rate <= 0) {
    throw new Error(`No FX rate available for currency ${currency}`);
  }
  // Round to whole euros: sub-euro precision is meaningless at these price points.
  return Math.round(amount / rate);
}

interface CachedSnapshot {
  date: string;
  rates: FxRates;
}

let cache: CachedSnapshot | null = null;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Daily FX snapshot (§7.3): ECB reference rates via the keyless Frankfurter API
 * (FX_API_URL, default https://api.frankfurter.app). Fetched once per calendar
 * day per server process; falls back to the static table per currency (the ECB
 * does not publish AED — its USD-pegged fallback always applies). Never throws.
 */
export async function getDailyRatesPerEur(): Promise<FxRates> {
  const today = todayKey();
  if (cache && cache.date === today) return cache.rates;

  const baseUrl = process.env.FX_API_URL || 'https://api.frankfurter.app';
  try {
    const res = await fetch(`${baseUrl}/latest?from=EUR&to=USD,GBP,CHF,SGD,HKD`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number> };
      if (data.rates) {
        const rates: FxRates = {
          EUR: 1,
          USD: data.rates.USD ?? FALLBACK_RATES_PER_EUR.USD,
          GBP: data.rates.GBP ?? FALLBACK_RATES_PER_EUR.GBP,
          CHF: data.rates.CHF ?? FALLBACK_RATES_PER_EUR.CHF,
          AED: (data.rates.USD ?? FALLBACK_RATES_PER_EUR.USD) * 3.6725,
          SGD: data.rates.SGD ?? FALLBACK_RATES_PER_EUR.SGD,
          HKD: data.rates.HKD ?? FALLBACK_RATES_PER_EUR.HKD,
        };
        cache = { date: today, rates };
        return rates;
      }
    }
  } catch {
    // fall through to the static snapshot
  }

  cache = { date: today, rates: FALLBACK_RATES_PER_EUR };
  return FALLBACK_RATES_PER_EUR;
}

/** Test hook: clear the in-memory daily cache. */
export function resetFxCache(): void {
  cache = null;
}
