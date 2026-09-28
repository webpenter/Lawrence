import { describe, expect, it } from 'vitest';

import { convertToEur, type FxRates } from './fx';

const RATES: FxRates = { EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.94, AED: 3.97, SGD: 1.45, HKD: 8.42 };

describe('convertToEur (spec §6.2 — priceEur drives all sorting and filtering)', () => {
  it('is identity for EUR', () => {
    expect(convertToEur(14_500_000, 'EUR', RATES)).toBe(14_500_000);
  });

  it('converts a USD listing correctly (the acceptance criterion)', () => {
    // $10,800,000 at 1.08 USD per EUR = €10,000,000
    expect(convertToEur(10_800_000, 'USD', RATES)).toBe(10_000_000);
  });

  it('converts GBP (rate below 1)', () => {
    expect(convertToEur(850_000, 'GBP', RATES)).toBe(1_000_000);
  });

  it('rounds to whole euros', () => {
    expect(convertToEur(1_000_000, 'USD', RATES)).toBe(925_926);
  });

  it('throws on a missing rate rather than silently producing a wrong price', () => {
    expect(() => convertToEur(100, 'USD', { EUR: 1 } as FxRates)).toThrow();
  });
});
