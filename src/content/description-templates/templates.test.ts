import { describe, expect, it } from 'vitest';

import { buildAllBlueprints } from '@/lib/sample/economics';
import { SAMPLE_DESTINATION_BY_SLUG } from '@/lib/sample/markets';

import { composeDescription, composeTitle, DESCRIPTION_TEMPLATES } from './index';
import type { DescriptionInput } from './types';

const LOCALES = ['en', 'it', 'fr', 'de', 'es', 'ru'] as const;

function inputFor(index: number): DescriptionInput {
  const b = buildAllBlueprints()[index]!;
  const destination = SAMPLE_DESTINATION_BY_SLUG.get(b.destinationSlug)!;
  return {
    index: b.index,
    propertyType: b.propertyType,
    locality: b.locality,
    destinationName: destination.name,
    waterBodyName: destination.waterBody?.name ?? '',
    primaryAccess: b.waterFrontageM != null ? 'direct_shore' : '',
    beachType: 'sand',
    bedrooms: b.bedrooms,
    bathrooms: b.bathrooms,
    builtAreaSqm: b.builtAreaSqm,
    plotAreaSqm: b.plotAreaSqm,
    terraceAreaSqm: b.terraceAreaSqm,
    waterFrontageM: b.waterFrontageM,
    maxBoatLoaM: b.maxBoatLoaM,
    waterDepthAtBerthM:
      b.maxBoatLoaM != null ? Math.round((1.8 + b.maxBoatLoaM / 12) * 10) / 10 : null,
    nearestMarinaName: `${b.locality} Marina`,
    nearestMarinaDistanceKm: 1 + (b.index % 5),
    approxPriceEur: b.approxPriceEur,
  };
}

describe('§13.8 description grammar', () => {
  it('is deterministic per listing and differs between listings', () => {
    const en = DESCRIPTION_TEMPLATES.en!;
    expect(composeDescription(inputFor(4), en)).toBe(composeDescription(inputFor(4), en));
    expect(composeDescription(inputFor(4), en)).not.toBe(composeDescription(inputFor(5), en));
  });

  it('numbers come from the structured fields', () => {
    const input = inputFor(0);
    const text = composeDescription(input, DESCRIPTION_TEMPLATES.en!);
    expect(text).toContain(String(input.bedrooms));
    expect(text).toContain(String(input.builtAreaSqm));
    if (input.waterFrontageM != null) expect(text).toContain(String(input.waterFrontageM));
  });

  it('every locale renders every listing with no unfilled placeholders and review-grade length', () => {
    for (const locale of LOCALES) {
      const templates = DESCRIPTION_TEMPLATES[locale]!;
      for (let index = 0; index < 45; index += 1) {
        const input = inputFor(index);
        const text = composeDescription(input, templates);
        expect(text, `${locale} #${index}`).not.toMatch(/\{\w+\}/);
        expect(text.length, `${locale} #${index}`).toBeGreaterThanOrEqual(250);
        const title = composeTitle(input, templates);
        expect(title, `${locale} title #${index}`).not.toMatch(/\{\w+\}/);
        expect(title.length, `${locale} title #${index}`).toBeGreaterThan(8);
      }
    }
  });

  it('EN descriptions clear the §8.6 300-character pre-check', () => {
    for (let index = 0; index < 45; index += 1) {
      expect(
        composeDescription(inputFor(index), DESCRIPTION_TEMPLATES.en!).length,
        `#${index}`,
      ).toBeGreaterThanOrEqual(300);
    }
  });

  it('omits the nautical sentence when there is no berth', () => {
    const noBerth = { ...inputFor(0), maxBoatLoaM: null, waterDepthAtBerthM: null };
    const text = composeDescription(noBerth, DESCRIPTION_TEMPLATES.en!);
    expect(text).not.toContain('berth takes');
  });
});
