import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RichText } from '@payloadcms/richtext-lexical/react';

import { AnalyticsBeacon } from '@/components/analytics/AnalyticsBeacon';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { EnquiryForm } from '@/components/property/EnquiryForm';
import { StatsStrip } from '@/components/property/StatsStrip';
import { humanizeEnum } from '@/components/property/WaterChips';
import { HitCard } from '@/components/search/HitCard';
import { Link } from '@/i18n/navigation';
import {
  getAggregatesForScope,
  getLandingPageBySlug,
  getPublishedLandingPages,
  searchPropertiesPostgres,
  type Locale,
  type ScopeAggregates,
} from '@/lib/db';
import type { SearchHit } from '@/lib/search/client';
import {
  comboToFilters,
  comboToSearchQuery,
  normalizeComboSlug,
  passesEditorialGate,
  rankSiblings,
} from '@/lib/seo/combos';
import { fallbackSearch } from '@/lib/sample/fallback';
import {
  fallbackLandingPages,
  findFallbackLandingPage,
  isFallbackContent,
} from '@/lib/sample/fallback-content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { breadcrumbJsonLd, faqPageJsonLd } from '@/lib/seo/jsonld';
import type { LandingPage } from '@/payload-types';

// Programmatic landing pages (§5.4, §10.4): SSG over published records + ISR.
export const revalidate = 900;

interface ComboPageProps {
  params: Promise<{ locale: string; combo: string }>;
}

export async function generateStaticParams(): Promise<Array<{ combo: string }>> {
  try {
    const pages = await getPublishedLandingPages();
    return pages.filter(passesEditorialGate).map((page) => ({ combo: page.slug }));
  } catch {
    return [];
  }
}

async function loadGatedPage(combo: string, locale: string): Promise<LandingPage | null> {
  try {
    const page = await getLandingPageBySlug(combo, locale as Locale);
    return page && passesEditorialGate(page) ? page : null;
  } catch (err) {
    // DB-error path only (§13.12): the gated demo landing keeps the route
    // demonstrable; unknown combos still 404 and demo pages are noindexed.
    console.warn('[landing] load failed, trying fallback inventory:', err);
    return findFallbackLandingPage(combo);
  }
}

async function safeAggregates(page: LandingPage): Promise<ScopeAggregates> {
  try {
    const filters = comboToFilters(page);
    return await getAggregatesForScope({
      country: filters.country,
      waterBodyType: filters.waterBodyTypes?.[0],
      propertyType: filters.propertyTypes?.[0],
      destinationId: filters.destinationId,
    });
  } catch {
    if (isFallbackContent(page)) {
      // Demo aggregates derived from the same deterministic sample inventory
      // the cards come from — the page is noindexed, so nothing here is
      // published as a market claim (§13.9).
      const { hits, total } = fallbackSearch({ ...comboToFilters(page), limit: 100 });
      const median = (values: number[]): number | null => {
        if (values.length === 0) return null;
        const sorted = [...values].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
      };
      return {
        count: total,
        medianPriceEur: median(
          hits.map((h) => h.priceEur).filter((v): v is number => typeof v === 'number'),
        ),
        medianFrontageM: median(
          hits.map((h) => h.waterFrontageM).filter((v): v is number => typeof v === 'number'),
        ),
        topPropertyType:
          typeof hits[0]?.propertyType === 'string' ? (hits[0].propertyType as string) : null,
      };
    }
    return { count: 0, medianPriceEur: null, medianFrontageM: null, topPropertyType: null };
  }
}

async function safeListings(page: LandingPage): Promise<SearchHit[]> {
  try {
    const result = await searchPropertiesPostgres({ ...comboToFilters(page), limit: 12 });
    return result.hits;
  } catch {
    if (isFallbackContent(page)) {
      return fallbackSearch({ ...comboToFilters(page), limit: 12 }).hits;
    }
    return [];
  }
}

async function safeSiblings(page: LandingPage, locale: string): Promise<LandingPage[]> {
  try {
    const all = await getPublishedLandingPages(locale as Locale);
    return rankSiblings(page, all.filter(passesEditorialGate), 8);
  } catch {
    if (isFallbackContent(page)) {
      return rankSiblings(page, fallbackLandingPages(), 8);
    }
    return [];
  }
}

export async function generateMetadata({ params }: ComboPageProps): Promise<Metadata> {
  const { combo, locale } = await params;
  const page = await loadGatedPage(combo, locale);
  if (!page) return {};
  const aggregates = await safeAggregates(page);

  // §11.4 landing templates with §14.2 fallbacks; count keeps titles unique.
  const generatedDescription = [
    `Browse ${aggregates.count} verified waterfront listings.`,
    aggregates.medianPriceEur != null
      ? `Median price €${Math.round(aggregates.medianPriceEur / 1000)}k.`
      : null,
    aggregates.medianFrontageM != null
      ? `Median frontage ${aggregates.medianFrontageM} m.`
      : null,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    ...buildPageMetadata({
      title: page.metaTitle ?? `${page.title} — ${aggregates.count} for sale`,
      description: page.metaDescription ?? generatedDescription,
      path: `/waterfront/${combo}`,
      locale,
      ogImage: `/api/og/landing/${combo}`,
    }),
    // Demo fallback landing pages never enter the index (§13.12).
    ...(isFallbackContent(page) ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function ComboPage({ params }: ComboPageProps) {
  const { locale, combo } = await params;
  setRequestLocale(locale);

  // §5.4: exactly one canonical URL per combination — aliases 301.
  const canonical = normalizeComboSlug(combo);
  if (canonical !== combo) {
    permanentRedirect(`/${locale}/waterfront/${canonical}`);
  }

  const page = await loadGatedPage(combo, locale);
  if (!page) notFound();

  const t = await getTranslations('landing');
  const ts = await getTranslations('search');
  const tl = await getTranslations('listing');

  const [aggregates, listings, siblings] = await Promise.all([
    safeAggregates(page),
    safeListings(page),
    safeSiblings(page, locale),
  ]);

  const faq = (page.faq ?? []).map((entry) => ({
    question: entry.question,
    answer: entry.answer,
  }));
  const jsonLd = [
    breadcrumbJsonLd(locale, [
      { name: tl('breadcrumbHome'), path: '' },
      { name: page.title, path: `/waterfront/${combo}` },
    ]),
    ...(faqPageJsonLd(faq) ? [faqPageJsonLd(faq)] : []),
  ];

  return (
    <>
      <SiteHeader />
      <AnalyticsBeacon event="landing_viewed" props={{ comboSlug: combo }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        {/* Editorial first (§10.4): the intro opens with a direct answer (§14.6). */}
        <div className="max-w-[74ch] px-7 pb-2 pt-7">
          {/* Preview .prose label: "Waterfront · Villas · Liguria". */}
          <p className="mb-2 text-[length:var(--text-xs)] uppercase tracking-[0.18em] text-graphite">
            {[
              t('kicker'),
              page.combo?.propertyType ? humanizeEnum(page.combo.propertyType) : null,
              page.combo?.waterBodyType ? humanizeEnum(page.combo.waterBodyType) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <h1 className="mb-3 font-display text-2xl text-ink">{page.title}</h1>
          <div className="text-sm leading-relaxed text-graphite">
            {page.intro ? <RichText data={page.intro} /> : null}
          </div>
        </div>

        <StatsStrip aggregates={aggregates} />

        {listings.length > 0 ? (
          <section className="px-7 py-7">
            {/* sr-only h2 keeps the card h3s in a valid heading order (§15). */}
            <h2 className="sr-only">{t('listingsHeading')}</h2>
            {/* Preview §5: landing listings are a grid3 card grid, not rows. */}
            <div className="grid gap-5 md:grid-cols-3">
              {listings.slice(0, 6).map((hit) => (
                <HitCard key={hit.id} hit={hit} />
              ))}
            </div>
            <Link
              href={`/search${comboToSearchQuery(page)}`}
              className="mt-5 inline-block bg-obsidian px-5 py-3 text-xs uppercase tracking-[0.14em] text-vellum"
            >
              {t('viewAllCta', { count: aggregates.count })}
            </Link>
          </section>
        ) : null}

        {page.body ? (
          <section className="max-w-[74ch] px-7 pb-4 text-sm leading-relaxed text-graphite">
            <RichText data={page.body} />
          </section>
        ) : null}

        {siblings.length > 0 ? (
          <nav aria-label={t('siblingsTitle')} className="px-7 py-5">
            <h2 className="mb-3 font-display text-lg text-ink">{t('siblingsTitle')}</h2>
            <div className="flex flex-wrap gap-2">
              {siblings.map((sibling) => (
                <Link
                  key={sibling.id}
                  href={`/waterfront/${sibling.slug}`}
                  className="border border-line px-3 py-1.5 text-xs text-patina hover:bg-bone"
                >
                  {sibling.title}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}

        {faq.length > 0 ? (
          <section className="max-w-[74ch] px-7 py-5">
            <h2 className="mb-3 font-display text-lg text-ink">{t('faqTitle')}</h2>
            {faq.map((entry) => (
              <details key={entry.question} className="border-b border-line py-3">
                <summary className="cursor-pointer text-sm font-medium text-ink">
                  {entry.question}
                </summary>
                <p className="pt-2 text-sm leading-relaxed text-graphite">{entry.answer}</p>
              </details>
            ))}
          </section>
        ) : null}

        <section className="max-w-md px-7 py-7">
          <h2 className="mb-1 font-display text-lg text-ink">{t('enquiryTitle')}</h2>
          <p className="mb-4 text-xs text-graphite">{t('enquirySub')}</p>
          <EnquiryForm
            source="landing"
            locale={locale}
            labels={{
              name: tl('formName'),
              email: tl('formEmail'),
              phone: tl('formPhone'),
              message: tl('formMessage'),
              consent: tl('enquiryConsent'),
              submit: tl('formSubmit'),
              sending: tl('formSending'),
              success: tl('formSuccess'),
              error: tl('formError'),
              consentRequired: tl('formConsentRequired'),
              errorSummary: tl('formErrorSummary'),
              errorName: tl('formErrorName'),
              errorEmail: tl('formErrorEmail'),
            }}
          />
        </section>

        <p className="sr-only">{ts('resultsCount', { count: aggregates.count })}</p>
      </main>
      <SiteFooter />
    </>
  );
}
