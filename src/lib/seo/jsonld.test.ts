import { describe, expect, it } from 'vitest';

import type { Property } from '@/payload-types';

import { breadcrumbJsonLd, datasetJsonLd, realEstateListingJsonLd } from './jsonld';

const property = {
  id: 1,
  slug: 'palazzo-private-dock-portofino',
  title: 'Palazzo with private dock and 38 m of sea frontage',
  propertyType: 'palazzo',
  priceType: 'fixed',
  currency: 'EUR',
  priceDisclosure: 'exact',
  priceEur: 34_500_000,
  valueTier: 'trophy',
  channel: 'public',
  status: 'available',
  features: ['helipad', 'wine_cellar'],
  heritageStatus: 'listed',
  waterfront: {
    waterAccess: true,
    waterBodyType: 'sea',
    waterFrontageM: 38,
    mooringType: 'fixed_dock',
    maxBoatLoaM: 26,
    berthCount: 2,
  },
  publishedAt: '2026-09-21T00:00:00.000Z',
  location: { locality: 'Portofino', region: 'Liguria', country: 'IT' },
} as unknown as Property;

describe('realEstateListingJsonLd (§15.4)', () => {
  const jsonLd = realEstateListingJsonLd(property, 'en');

  it('emits RealEstateListing with an Offer in EUR', () => {
    expect(jsonLd['@type']).toBe('RealEstateListing');
    expect(jsonLd.offers).toMatchObject({
      '@type': 'Offer',
      price: 34_500_000,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    });
  });

  it('maps features and the waterfront sub-block into LocationFeatureSpecification', () => {
    const features = jsonLd.amenityFeature as Array<{ name: string; value: unknown }>;
    const names = features.map((f) => f.name);
    expect(names).toContain('helipad');
    expect(names).toContain('wine cellar');
    expect(names).toContain('Heritage status');
    expect(names).toContain('Private water frontage (m)');
    expect(names).toContain('Max boat length (m)');
    expect(features.find((f) => f.name === 'Private water frontage (m)')?.value).toBe(38);
  });

  it('omits the offer entirely for price-on-request listings (audit:exposure rule)', () => {
    const porJsonLd = realEstateListingJsonLd(
      {
        ...property,
        priceDisclosure: 'on_request',
        // Even a stale computed priceEur must not leak when disclosure forbids it.
        priceEur: 34_500_000,
      } as unknown as Property,
      'en',
    );
    expect(porJsonLd.offers).toBeUndefined();
  });

  it('emits an AggregateOffer band for band-disclosed listings', () => {
    const bandJsonLd = realEstateListingJsonLd(
      {
        ...property,
        priceDisclosure: 'band',
        priceEur: null,
        priceBandMinEur: 30_000_000,
        priceBandMaxEur: 40_000_000,
      } as unknown as Property,
      'en',
    );
    expect(bandJsonLd.offers).toMatchObject({
      '@type': 'AggregateOffer',
      lowPrice: 30_000_000,
      highPrice: 40_000_000,
    });
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
      { name: 'Search', path: '/collection' },
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
    expect(jsonLd.name).toBe('Lawrence Private Collection');
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

  it('Dataset (§15.5) links the page and its JSON distribution', () => {
    const jsonLd = datasetJsonLd({
      name: 'Lake Como — Market data',
      description: 'Sourced figures for Lake Como.',
      url: '/en/markets/lake-como',
      dataUrl: '/api/public/markets/lake-como/stats',
      dateModified: '2026-06-30T00:00:00.000Z',
    });
    expect(jsonLd['@type']).toBe('Dataset');
    expect(String(jsonLd.url)).toContain('/en/markets/lake-como');
    const distribution = jsonLd.distribution as Array<{ contentUrl: string; encodingFormat: string }>;
    expect(distribution[0]?.encodingFormat).toBe('application/json');
    expect(distribution[0]?.contentUrl).toContain('/api/public/markets/lake-como/stats');
    expect(jsonLd.isAccessibleForFree).toBe(true);
    expect(jsonLd.dateModified).toBe('2026-06-30T00:00:00.000Z');
  });
});
