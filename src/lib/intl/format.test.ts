import { describe, expect, it } from 'vitest';

import type { FxRates } from '@/lib/fx';

import { formatArea, formatLength, formatPriceEur, isCurrency, isUnitSystem } from './format';

const RATES: FxRates = { EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.94, AED: 3.97, SGD: 1.45, HKD: 8.42 };

describe('formatPriceEur (Prompt 6 currency switcher)', () => {
  it('formats EUR without conversion', () => {
    expect(formatPriceEur(14_500_000, 'EUR', 'en', RATES)).toBe('€14,500,000');
  });

  it('converts EUR → USD with the snapshot rate', () => {
    expect(formatPriceEur(10_000_000, 'USD', 'en', RATES)).toBe('$10,800,000');
  });

  it('respects the display locale', () => {
    const formatted = formatPriceEur(1_000_000, 'EUR', 'de', RATES);
    expect(formatted).toContain('1.000.000');
  });

  it('never shows decimals', () => {
    expect(formatPriceEur(1_234_567, 'GBP', 'en', RATES)).not.toContain('.');
  });
});

describe('unit formatting (Prompt 6 unit switcher)', () => {
  it('formats areas in both systems', () => {
    expect(formatArea(740, 'metric')).toBe('740 m²');
    expect(formatArea(740, 'imperial')).toBe('7,965 sq ft');
  });

  it('formats lengths in both systems', () => {
    expect(formatLength(24, 'metric')).toBe('24 m');
    expect(formatLength(24, 'imperial')).toBe('78.7 ft');
  });
});

describe('preference guards', () => {
  it('accepts only known currencies', () => {
    expect(isCurrency('EUR')).toBe(true);
    expect(isCurrency('BTC')).toBe(false);
    expect(isCurrency(undefined)).toBe(false);
  });

  it('accepts only metric/imperial', () => {
    expect(isUnitSystem('metric')).toBe(true);
    expect(isUnitSystem('imperial')).toBe(true);
    expect(isUnitSystem('nautical')).toBe(false);
  });
});
