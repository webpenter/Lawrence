import { brand } from '@/config/brand';
import type { Property } from '@/payload-types';

// §15.4: JSON-LD for listing pages — RealEstateListing + Offer +
// BreadcrumbList, with the §6.3 features and waterfront sub-block mapped into
// amenityFeature/LocationFeatureSpecification. Never invent values: only
// populated fields are emitted, and the price obeys priceDisclosure.

type Json = Record<string, unknown>;

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? brand.siteUrl).replace(/\/$/, '');
}

function feature(name: string, value: unknown): Json {
  return {
    '@type': 'LocationFeatureSpecification',
    name,
    value,
  };
}

export function propertyAmenityFeatures(property: Property): Json[] {
  const features: Json[] = [];
  for (const item of property.features ?? []) {
    features.push(feature(item.replace(/_/g, ' '), true));
  }
  if (property.heritageStatus && property.heritageStatus !== 'none')
    features.push(feature('Heritage status', property.heritageStatus));
  const waterfront = property.waterfront;
  if (waterfront?.waterAccess) {
    features.push(feature('Water access', true));
    if (waterfront.waterBodyType)
      features.push(feature('Water body type', waterfront.waterBodyType));
    if (waterfront.waterFrontageM != null)
      features.push(feature('Private water frontage (m)', waterfront.waterFrontageM));
    if (waterfront.mooringType && waterfront.mooringType !== 'none')
      features.push(feature('Mooring', waterfront.mooringType));
    if (waterfront.maxBoatLoaM != null)
      features.push(feature('Max boat length (m)', waterfront.maxBoatLoaM));
    if (waterfront.berthCount != null) features.push(feature('Berths', waterfront.berthCount));
  }
  return features;
}

export function realEstateListingJsonLd(property: Property, locale: string): Json {
  const url = `${siteUrl()}/${locale}/property/${property.slug}`;
  const jsonLd: Json = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': url,
    url,
    name: property.title,
    datePosted: property.publishedAt ?? undefined,
    amenityFeature: propertyAmenityFeatures(property),
  };

  if (property.location?.locality || property.location?.country) {
    jsonLd.address = {
      '@type': 'PostalAddress',
      addressLocality: property.location?.locality ?? undefined,
      addressRegion: property.location?.region ?? undefined,
      addressCountry: property.location?.country ?? undefined,
    };
  }

  // audit:exposure rule: a price appears ONLY when priceDisclosure is exact.
  if (property.priceDisclosure === 'exact' && property.priceEur != null) {
    jsonLd.offers = {
      '@type': 'Offer',
      price: property.priceEur,
      priceCurrency: 'EUR',
      availability:
        property.status === 'under_offer'
          ? 'https://schema.org/LimitedAvailability'
          : 'https://schema.org/InStock',
      url,
    };
  } else if (
    property.priceDisclosure === 'band' &&
    (property.priceBandMinEur != null || property.priceBandMaxEur != null)
  ) {
    jsonLd.offers = {
      '@type': 'AggregateOffer',
      lowPrice: property.priceBandMinEur ?? undefined,
      highPrice: property.priceBandMaxEur ?? undefined,
      priceCurrency: 'EUR',
      url,
    };
  }

  return jsonLd;
}

/** §14.3: consistent Organization entity with sameAs links — entity clarity for machines. */
export function organizationJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl()}/#organization`,
    name: brand.name,
    legalName: brand.legalName,
    url: siteUrl(),
    email: brand.email.contact,
    sameAs: Object.values(brand.socials),
  };
}

/** §14.3: WebSite with SearchAction so assistants and Google know how to search us. */
export function webSiteJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl()}/#website`,
    name: brand.name,
    url: siteUrl(),
    publisher: { '@id': `${siteUrl()}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl()}/en/collection?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** §14.3: Article for journal posts, with freshness signals. */
export function articleJsonLd(article: {
  slug: string;
  title: string;
  excerpt?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  authorName?: string | null;
}, locale: string): Json {
  const url = `${siteUrl()}/${locale}/journal/${article.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': url,
    mainEntityOfPage: url,
    headline: article.title,
    description: article.excerpt ?? undefined,
    datePublished: article.publishedAt ?? undefined,
    dateModified: article.updatedAt ?? article.publishedAt ?? undefined,
    author: article.authorName
      ? { '@type': 'Person', name: article.authorName }
      : { '@id': `${siteUrl()}/#organization` },
    publisher: { '@id': `${siteUrl()}/#organization` },
  };
}

/** §14.3: RealEstateAgent for agency profile pages. */
export function realEstateAgentJsonLd(agency: {
  slug: string;
  name: string;
  description?: string | null;
  email?: string | null;
  website?: string | null;
  country?: string | null;
}, locale: string): Json {
  const url = `${siteUrl()}/${locale}/agencies/${agency.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': url,
    url,
    name: agency.name,
    description: agency.description ?? undefined,
    email: agency.email ?? undefined,
    sameAs: agency.website ? [agency.website] : undefined,
    address: agency.country
      ? { '@type': 'PostalAddress', addressCountry: agency.country }
      : undefined,
  };
}

export function faqPageJsonLd(
  faq: Array<{ question: string; answer: string }>,
): Json | null {
  if (faq.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}

export function breadcrumbJsonLd(
  locale: string,
  crumbs: Array<{ name: string; path: string }>,
): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${siteUrl()}/${locale}${crumb.path}`,
    })),
  };
}
