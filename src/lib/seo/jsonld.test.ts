import { describe, expect, it } from 'vitest';

import type { Property } from '@/payload-types';

import { breadcrumbJsonLd, realEstateListingJsonLd } from './jsonld';

const property = {
  id: 1,
  slug: 'villa-private-dock-portofino',
  title: 'Villa with private dock and 38 m of sea frontage',
  propertyType: 'villa',
  priceType: 'fixed',
  currency: 'EUR',
  priceEur: 14_500_000,
  status: 'in_market',
  waterBodyType: 'sea',
  waterAccessType: ['private_dock', 'direct_shore'],
  waterFrontageM: 38,
  distanceToWaterM: 0,
  maxBoatLoaM: 26,
  waterDepthAtBerthM: 3.2,
  navigableToOpenSea: true,
  mooringType: 'fixed_dock',
  publishedAt: '2026-09-21T00:00:00.000Z',
  location: { locality: 'Portofino', region: 'Liguria', country: 'IT' },
} as unknown as Property;

describe('realEstateListingJsonLd (§14.3)', () => {
  const jsonLd = realEstateListingJsonLd(property, 'en');

  it('emits RealEstateListing with an Offer in EUR', () => {
    expect(jsonLd['@type']).toBe('RealEstateListing');
    expect(jsonLd.offers).toMatchObject({
      '@type': 'Offer',
      price: 14_500_000,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    });
  });

  it('maps water and nautical fields into LocationFeatureSpecification', () => {
    const features = jsonLd.amenityFeature as Array<{ name: string; value: unknown }>;
    const names = features.map((f) => f.name);
    expect(names).toContain('Private water frontage (m)');
    expect(names).toContain('Max boat length (m)');
    expect(names).toContain('Water depth at berth (m)');
    expect(names).toContain('Navigable to open sea');
    expect(features.find((f) => f.name === 'Private water frontage (m)')?.value).toBe(38);
  });

  it('omits the offer entirely for price-on-request listings', () => {
    const porJsonLd = realEstateListingJsonLd(
      { ...property, priceType: 'on_request', priceEur: null } as unknown as Property,
      'en',
    );
    expect(porJsonLd.offers).toBeUndefined();
  });

  it('marks under-offer listings as LimitedAvailability', () => {
    const uo = realEstateListingJsonLd(
      { ...property, status: 'under_offer' } as unknown as Property,
      'en',
    );
    expect((uo.offers as { availability: string }).availability).toBe(
      'https://schema.org/LimitedAvailability',
    );
  });
});

describe('breadcrumbJsonLd', () => {
  it('numbers the trail and prefixes the locale', () => {
    const jsonLd = breadcrumbJsonLd('en', [
      { name: 'Home', path: '' },
      { name: 'Search', path: '/search' },
      { name: 'Villa', path: '/property/villa' },
    ]);
    const items = jsonLd.itemListElement as Array<{ position: number; item: string }>;
    expect(items).toHaveLength(3);
    expect(items[0]?.position).toBe(1);
    expect(items[2]?.item).toMatch(/\/en\/property\/villa$/);
  });
});

describe('organization + website JSON-LD (§14.3)', async () => {
  const { organizationJsonLd, webSiteJsonLd, articleJsonLd, realEstateAgentJsonLd } = await import(
    './jsonld'
  );

  it('Organization carries identity and sameAs links', () => {
    const jsonLd = organizationJsonLd();
    expect(jsonLd['@type']).toBe('Organization');
    expect(jsonLd.name).toBe('LAWRENCE PRIVATE COLLECTION');
    expect(Array.isArray(jsonLd.sameAs)).toBe(true);
    expect((jsonLd.sameAs as string[]).length).toBeGreaterThan(0);
  });

  it('WebSite exposes a SearchAction with query-input', () => {
    const jsonLd = webSiteJsonLd();
    expect(jsonLd['@type']).toBe('WebSite');
    const action = jsonLd.potentialAction as { '@type': string; 'query-input': string };
    expect(action['@type']).toBe('SearchAction');
    expect(action['query-input']).toContain('search_term_string');
  });

  it('Article carries freshness signals and a publisher', () => {
    const jsonLd = articleJsonLd(
      {
        slug: 'no-fixed-bridges',
        title: 'What “no fixed bridges” means',
        publishedAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-20T00:00:00.000Z',
        authorName: 'Editorial Desk',
      },
      'en',
    );
    expect(jsonLd['@type']).toBe('Article');
    expect(jsonLd.dateModified).toBe('2026-09-20T00:00:00.000Z');
    expect((jsonLd.author as { name: string }).name).toBe('Editorial Desk');
  });

  it('RealEstateAgent builds from an agency profile', () => {
    const jsonLd = realEstateAgentJsonLd(
      { slug: 'riviera-blu', name: 'Riviera Blu', country: 'IT', website: 'https://example.com' },
      'en',
    );
    expect(jsonLd['@type']).toBe('RealEstateAgent');
    expect(String(jsonLd.url)).toContain('/en/agencies/riviera-blu');
    expect(jsonLd.sameAs).toEqual(['https://example.com']);
  });
});
