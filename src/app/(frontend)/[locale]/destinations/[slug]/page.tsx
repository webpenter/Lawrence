import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RichText } from '@payloadcms/richtext-lexical/react';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { StatsStrip } from '@/components/property/StatsStrip';
import { SearchResultCard } from '@/components/search/SearchResultCard';
import { Link } from '@/i18n/navigation';
import {
  getAggregatesForScope,
  getDestinationBySlug,
  getDestinationCounts,
  getPublishedLandingPages,
  searchPropertiesPostgres,
  type Locale,
  type ScopeAggregates,
} from '@/lib/db';
import type { SearchHit } from '@/lib/search/client';
import { passesEditorialGate } from '@/lib/seo/combos';
import { hreflangAlternates } from '@/lib/seo/hreflang';
import { breadcrumbJsonLd } from '@/lib/seo/jsonld';
import type { Destination, LandingPage } from '@/payload-types';
import { HERO_SCRIM, horizonGradientFor } from '@/tokens/placeholders';
import { layout } from '@/tokens/layout';

// Destination pages (§10.5): SSG over known destinations + ISR.
export const revalidate = 900;

interface DestinationPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const counts = await getDestinationCounts();
    return counts.map((destination) => ({ slug: destination.slug }));
  } catch {
    return [];
  }
}

async function loadDestination(slug: string, locale: string): Promise<Destination | null> {
  try {
    return await getDestinationBySlug(slug, locale as Locale);
  } catch (err) {
    console.warn('[destination] load failed, treating as not found:', err);
    return null;
  }
}

export async function generateMetadata({ params }: DestinationPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const destination = await loadDestination(slug, locale);
  if (!destination) return {};
  const t = await getTranslations('destinations');
  return {
    // §11.4: "Waterfront property for sale in {Destination} | {brand}".
    title: destination.metaTitle ?? t('metaTitle', { destination: destination.name }),
    description: destination.metaDescription ?? undefined,
    alternates: hreflangAlternates(`/destinations/${slug}`),
  };
}

export default async function DestinationPage({ params }: DestinationPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const destination = await loadDestination(slug, locale);
  if (!destination) notFound();

  const t = await getTranslations('destinations');
  const tl = await getTranslations('listing');

  let aggregates: ScopeAggregates = {
    count: 0,
    medianPriceEur: null,
    medianFrontageM: null,
    topPropertyType: null,
  };
  let listings: SearchHit[] = [];
  let landingPages: LandingPage[] = [];
  try {
    [aggregates, { hits: listings }, landingPages] = await Promise.all([
      getAggregatesForScope({ destinationId: destination.id }),
      searchPropertiesPostgres({ destinationId: destination.id, limit: 12 }),
      getPublishedLandingPages(locale as Locale),
    ]);
  } catch {
    // Degrade to the editorial shell.
  }
  const related = landingPages
    .filter(passesEditorialGate)
    .filter((page) => {
      const dest = page.combo?.destination;
      return (typeof dest === 'object' ? dest?.id : dest) === destination.id;
    })
    .slice(0, 8);

  const jsonLd = breadcrumbJsonLd(locale, [
    { name: tl('breadcrumbHome'), path: '' },
    { name: t('hubTitle'), path: '/destinations' },
    { name: destination.name, path: `/destinations/${slug}` },
  ]);

  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <div
          className="relative flex items-end text-vellum"
          style={{ minHeight: layout.heroMinH }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: horizonGradientFor(destination.slug) }}
          />
          <span aria-hidden="true" className="absolute inset-0" style={{ background: HERO_SCRIM }} />
          <h1 className="relative z-10 px-7 pb-7 font-display text-3xl tracking-[-0.02em]">
            {destination.name}
          </h1>
        </div>

        <div className="py-6">
          <StatsStrip aggregates={aggregates} />
        </div>

        {destination.description ? (
          <section className="max-w-[74ch] px-7 pb-4 text-sm leading-relaxed text-graphite">
            <RichText data={destination.description} />
          </section>
        ) : null}

        {listings.length > 0 ? (
          <section className="px-7 py-5">
            <div className="flex flex-col gap-3">
              {listings.map((hit) => (
                <SearchResultCard key={hit.id} hit={hit} />
              ))}
            </div>
          </section>
        ) : null}

        {related.length > 0 ? (
          <nav aria-label={t('landingPagesTitle')} className="px-7 py-5">
            <h2 className="mb-3 font-display text-lg text-ink">{t('landingPagesTitle')}</h2>
            <div className="flex flex-wrap gap-2">
              {related.map((page) => (
                <Link
                  key={page.id}
                  href={`/waterfront/${page.slug}`}
                  className="border border-line px-3 py-1.5 text-xs text-patina hover:bg-bone"
                >
                  {page.title}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
