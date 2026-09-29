import { describe, expect, it } from 'vitest';

import { lexicalToText, runPreChecks, type PreCheckInput } from './pre-checks';

const CLEAN: PreCheckInput = {
  coordinates: [9.2099, 44.3034],
  priceEur: 26_000_000,
  imageCount: 8,
  descriptionText: 'x'.repeat(650),
  title: 'Palazzo with 38 m of private sea frontage',
};

describe('runPreChecks (§9.4 automated moderation)', () => {
  it('returns no flags for a clean listing (the auto-approve path)', () => {
    expect(runPreChecks(CLEAN, { destinationMedianEur: 8_000_000 })).toEqual([]);
  });

  it('flags the admission policy below €20M without the prime override', () => {
    const flags = runPreChecks({ ...CLEAN, priceEur: 15_000_000 });
    expect(flags.map((f) => f.code)).toContain('admission');
    expect(runPreChecks({ ...CLEAN, priceEur: 15_000_000, valueTier: 'prime' })).toEqual([]);
  });

  it('flags implausible and missing coordinates', () => {
    expect(runPreChecks({ ...CLEAN, coordinates: [0, 0] }).map((f) => f.code)).toContain(
      'coordinates_implausible',
    );
    expect(runPreChecks({ ...CLEAN, coordinates: null }).map((f) => f.code)).toContain(
      'coordinates_missing',
    );
  });

  it('flags price outliers only when a destination median exists', () => {
    expect(
      runPreChecks({ ...CLEAN, priceEur: 100_000_000 }, { destinationMedianEur: 5_000_000 }).map(
        (f) => f.code,
      ),
    ).toContain('price_outlier');
    expect(runPreChecks({ ...CLEAN, priceEur: 100_000_000 }, {})).toEqual([]);
  });

  it('flags a listing with no enforceable value at all', () => {
    expect(runPreChecks({ ...CLEAN, priceEur: null }).map((f) => f.code)).toContain('admission');
  });

  it('flags too few images and short descriptions', () => {
    const flags = runPreChecks({ ...CLEAN, imageCount: 3, descriptionText: 'short' });
    const codes = flags.map((f) => f.code);
    expect(codes).toContain('too_few_images');
    expect(codes).toContain('description_too_short');
  });

  it('flags phone numbers and emails in the public description', () => {
    const withPhone = runPreChecks({
      ...CLEAN,
      descriptionText: `${'x'.repeat(600)} call +39 333 123 4567`,
    });
    const withEmail = runPreChecks({
      ...CLEAN,
      descriptionText: `${'x'.repeat(600)} mail me at agent@example.com`,
    });
    expect(withPhone.map((f) => f.code)).toContain('contact_in_description');
    expect(withEmail.map((f) => f.code)).toContain('contact_in_description');
  });

  it('flags ALL-CAPS titles', () => {
    expect(
      runPreChecks({ ...CLEAN, title: 'STUNNING SEAFRONT VILLA PORTOFINO' }).map((f) => f.code),
    ).toContain('all_caps_title');
  });
});

describe('lexicalToText', () => {
  it('extracts nested text nodes', () => {
    const value = {
      root: {
        children: [
          { children: [{ text: 'Thirty-eight metres' }, { text: 'of private shoreline.' }] },
        ],
      },
    };
    expect(lexicalToText(value)).toBe('Thirty-eight metres of private shoreline.');
    expect(lexicalToText(null)).toBe('');
  });
});
