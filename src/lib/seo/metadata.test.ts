import { describe, expect, it } from 'vitest';

import {
  buildPageMetadata,
  clampDescription,
  clampTitle,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  TITLE_MAX,
} from './metadata';

describe('clampTitle (§14.2: titles ≤ 60 chars)', () => {
  it('keeps short titles verbatim', () => {
    expect(clampTitle('Villa with private dock in Portofino')).toBe(
      'Villa with private dock in Portofino',
    );
  });

  it('cuts at a word boundary, never mid-word', () => {
    const long =
      'Waterfront estate with ninety metres of private shoreline and a deep-water berth in Liguria';
    const clamped = clampTitle(long);
    expect(clamped.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(long.startsWith(clamped)).toBe(true);
    expect(long[clamped.length]).toBe(' ');
  });

  it('collapses whitespace', () => {
    expect(clampTitle('  Villa   with \n dock ')).toBe('Villa with dock');
  });
});

describe('clampDescription (§14.2: 140–160, never empty)', () => {
  it('never ships empty — falls back to the brand description', () => {
    const description = clampDescription('');
    expect(description.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN - 20);
    expect(description.length).toBeGreaterThan(0);
  });

  it('pads short descriptions toward the minimum', () => {
    const description = clampDescription('6 bedrooms in Portofino.');
    expect(description.startsWith('6 bedrooms in Portofino.')).toBe(true);
    expect(description.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN - 20);
  });

  it('cuts long descriptions near the maximum at a boundary', () => {
    const long = `${'A very fine waterfront property. '.repeat(20)}`;
    const clamped = clampDescription(long);
    expect(clamped.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(clamped.endsWith('.')).toBe(true);
  });
});

describe('buildPageMetadata', () => {
  const metadata = buildPageMetadata({
    title: 'Villa with private dock in Portofino',
    description: 'Thirty-eight metres of private Ligurian Sea frontage with a deep-water berth, six bedrooms and a private dock reached directly from the garden.',
    path: '/property/villa-portofino',
    locale: 'it',
    ogImage: '/api/og/property/villa-portofino',
  });

  it('carries canonical + all hreflang alternates', () => {
    const languages = metadata.alternates?.languages as Record<string, string>;
    expect(Object.keys(languages)).toEqual(
      expect.arrayContaining(['en', 'it', 'fr', 'de', 'es', 'ru', 'x-default']),
    );
    // §15.2: the canonical self-references the page's own locale.
    expect(String(metadata.alternates?.canonical)).toContain('/it/property/villa-portofino');
  });

  it('builds OG and Twitter cards with the absolute image URL', () => {
    const og = metadata.openGraph as { url: string; images: Array<{ url: string }> };
    expect(og.url).toContain('/it/property/villa-portofino');
    expect(og.images[0]?.url).toMatch(/^https?:\/\/.+\/api\/og\/property\/villa-portofino$/);
    expect((metadata.twitter as { card: string }).card).toBe('summary_large_image');
  });
});
