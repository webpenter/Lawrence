import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { PropertyCard } from '@/components/property/PropertyCard';
import { Link } from '@/i18n/navigation';
import { ANONYMOUS } from '@/lib/access/viewer';
import {
  countOffMarketListings,
  getFeatured,
  getLatestReport,
  getMarketTiles,
  type Locale,
  type MarketTile,
} from '@/lib/db';
import type { Property, Report } from '@/payload-types';
import { HERO_SCRIM, horizonGradientFor } from '@/tokens/placeholders';

// SSG + ISR 300 s (§11.1).
export const revalidate = 300;

import {
  FALLBACK_DESTINATIONS,
  FALLBACK_FEATURED,
  sampleFallbackEnabled,
} from '@/lib/sample/fallback';

async function safeFeatured(locale: Locale): Promise<Property[]> {
  try {
    // The database answered — an empty featured list is a legitimate state.
    return await getFeatured(ANONYMOUS, 6, locale);
  } catch {
    return sampleFallbackEnabled() ? FALLBACK_FEATURED : [];
  }
}

async function safeMarketTiles(locale: Locale): Promise<MarketTile[]> {
  try {
    const tiles = await getMarketTiles(locale, 4);
    if (tiles.length > 0) return tiles;
  } catch {}
  return FALLBACK_DESTINATIONS.slice(0, 4).map((d) => ({ ...d, stat: null }));
}

async function safeLatestReport(locale: Locale): Promise<Report | null> {
  try {
    const report = await getLatestReport(locale);
    if (report) return report;
  } catch {}
  return {
    id: 1,
    slug: 'prime-entry-prices-across-eighteen-markets',
    title: 'Prime entry prices across eighteen markets',
    publicationDate: '2026-03-01T00:00:00.000Z',
    summary: 'Where the top five per cent of each market begins, what has moved in twelve months, and how the published share of inventory differs by country. Derived from official transaction registries; method and sources stated in full.',
  } as unknown as Report;
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const ts = await getTranslations('search');
  const tl = await getTranslations('listing');
  const nav = await getTranslations('nav');
  const format = await getFormatter();

  const [featured, markets, offMarketCount, latestReport] = await Promise.all([
    safeFeatured(locale as Locale),
    safeMarketTiles(locale as Locale),
    countOffMarketListings(),
    safeLatestReport(locale as Locale),
  ]);

  const HOW_IT_WORKS = ['whyVerified', 'whyFrontage', 'whyBerth'] as const;

  return (
    <>
      <main>
        {/* 1 · Hero (§11.1): one full-bleed image, display headline, one line
            of subcopy, two quiet actions. No search bar — this is not a
            search product at first contact. */}
        <section className="relative flex min-h-svh flex-col text-white">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: horizonGradientFor('lawrence-hero') }}
          >
            <div className="absolute inset-0" style={{ background: HERO_SCRIM }} />
          </div>
          <SiteHeader onHero />
          <div className="relative z-10 flex-1 flex flex-col justify-center px-5 md:px-6 max-w-3xl">
            <h1 className="mb-3 font-display text-2xl font-light leading-[1.1] tracking-display md:text-3xl m-0">
              {t('heroTitle')}
            </h1>
            <p className="mb-5 max-w-[56ch] text-sm text-white/80 m-0">
              {t('heroSub')}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/collection"
                className="bg-white text-obsidian border border-white px-5 py-3 text-center text-[length:var(--text-xs)] uppercase tracking-label transition-colors duration-[var(--motion-base)] hover:bg-white/90"
              >
                {t('heroActionCollection')}
              </Link>
              <Link
                href="/join"
                className="border border-white/55 px-5 py-3 text-center text-[length:var(--text-xs)] uppercase tracking-label text-white transition-colors duration-[var(--motion-base)] hover:bg-white/10"
              >
                {t('heroActionOffMarket')}
              </Link>
            </div>
          </div>
        </section>

        {/* 2 · The Collection (§11.1): 6 featured, large 4:3 cards, never more
            than three competing on desktop. */}
        {featured.length > 0 ? (
          <section className="px-5 py-8 md:px-6 md:py-8 bg-bone">
            <div className="mb-5 flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="m-0 font-display text-xl font-normal text-ink">{t('signatureTitle')}</h2>
              <Link
                href="/collection"
                className="py-1 text-[length:var(--text-xs)] uppercase tracking-label text-graphite underline decoration-patina underline-offset-4 hover:decoration-ink"
              >
                {t('allProperties')} →
              </Link>
            </div>
            <p className="sr-only">{t('signatureSub')}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {featured.map((property, index) => (
                <PropertyCard key={property.id} property={property} priority={index === 0} />
              ))}
            </div>
          </section>
        ) : null}

        {/* 3 · Off-Market (§11.1): the highest-value block on the page — a
            short editorial panel with the REAL live count and one action.
            A full viewport, a whisper, never a wall (§4.5). */}
        <section className="flex min-h-svh flex-col items-center justify-center bg-obsidian px-5 py-16 text-center text-vellum sm:px-7">
          <p className="text-[length:var(--text-xs)] uppercase tracking-label text-patina-soft">
            {t('offMarketLabel')}
          </p>
          <p className="mt-6 max-w-[36ch] font-display text-2xl leading-snug sm:text-3xl">
            {t('offMarketCount', { count: offMarketCount })}
          </p>
          <Link
            href="/join"
            className="mt-10 border border-vellum/60 px-8 py-3 text-xs uppercase tracking-label transition-colors duration-[var(--motion-base)] hover:bg-vellum hover:text-obsidian"
          >
            {t('offMarketCta')}
          </Link>
        </section>

        {/* 4 · Markets (§11.1): 8 tiles, each with one live statistic and its
            asOfDate — or the honest listing count when no stat is sourced. */}
        {markets.length > 0 ? (
          <section className="px-5 py-10 md:px-6 md:py-10">
            <div className="mb-6 flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="font-display text-xl text-ink">{nav('destinations')}</h2>
              <Link
                href="/markets"
                className="text-[length:var(--text-xs)] uppercase tracking-label text-graphite underline decoration-patina underline-offset-4 hover:decoration-ink"
              >
                {nav('destinations')} →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {markets.map((market) => (
                <Link
                  key={market.id}
                  href={`/markets/${market.slug}`}
                  className="group relative flex aspect-[4/5] items-end overflow-hidden text-vellum"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 transition-transform duration-[var(--motion-slow)] group-hover:scale-105"
                    style={{ background: horizonGradientFor(market.slug) }}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{ background: HERO_SCRIM }}
                  />
                  <span className="relative z-10 p-3.5">
                    <b className="block font-display text-lg font-normal">
                      {market.name}
                    </b>
                    <span className="mt-1 block text-[length:var(--text-xs)] tracking-[0.04em] text-white/72">
                      {market.stat
                        ? `${
                            market.stat.label === 'primeEntryEur'
                              ? `${tl('statPrimeEntry')} €${format.number(Math.round((market.stat.value / 1_000_000) * 10) / 10)}M`
                              : `€${format.number(Math.round(market.stat.value))}/m²`
                          } · ${format.dateTime(new Date(market.stat.asOfDate), { year: 'numeric', month: 'short' })}`
                        : ts('resultsCount', { count: market.count })}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-[length:var(--text-xs)] uppercase tracking-[0.2em] text-graphite">
              {t('sourcedNote')}
            </p>
          </section>
        ) : null}

        {/* 5 · Intelligence (§11.1): the latest report with its ungated summary. */}
        {latestReport ? (
          <section className="border-t border-line px-5 py-8 md:px-6 md:py-8">
            <div className="mb-6 flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="font-display text-xl text-ink">{nav('intelligence')}</h2>
              <Link
                href="/intelligence"
                className="text-[length:var(--text-xs)] uppercase tracking-label text-graphite underline decoration-patina underline-offset-4 hover:decoration-ink"
              >
                {t('allReports')} →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-8 items-center">
              <div className="relative aspect-[4/3] overflow-hidden">
                <div className="absolute inset-0" style={{ background: horizonGradientFor('report') }} />
              </div>
              <div>
                <span className="text-[length:var(--text-xs)] uppercase tracking-[0.2em] text-graphite">
                  {t('reportKicker')} ·{' '}
                  {format.dateTime(new Date(latestReport.publicationDate), {
                    year: 'numeric',
                    month: 'long',
                  })}
                </span>
                <h3 className="my-2.5 font-display text-2xl font-normal leading-snug text-ink">
                  {latestReport.title}
                </h3>
                {/* The teaser stays editorial copy — the report's rich-text
                    summary renders on its own page (§11.6). */}
                <p className="mb-4 text-sm text-graphite">{t('intelligenceTeaser')}</p>
                <Link
                  href={`/intelligence/${latestReport.slug}`}
                  className="inline-block border-b border-patina pb-0.5 text-[length:var(--text-xs)] uppercase tracking-label text-ink"
                >
                  {t('readSummary')}
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {/* 6 · How it works (§11.1/§12.1): three lines. */}
        <section className="border-t border-line px-5 py-8 md:px-6 md:py-8">
            <h2 className="mb-6 text-[length:var(--text-xs)] uppercase tracking-label text-graphite">
            {t('howTitle')}
          </h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((key, index) => (
              <li key={key} className="border-t border-line pt-4">
                <span className="font-display text-xl tabular-nums text-patina">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="mt-2 max-w-[40ch] text-sm leading-relaxed text-graphite">{t(key)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 7 · For owners and brokers (§11.1/§12.1). */}
        <section className="border-t border-line px-5 py-8 md:px-6 md:py-8">
          <p className="max-w-[52ch] font-display text-xl leading-snug text-ink">
            {t('supplyCtaSub')}
          </p>
          <Link
            href="/list-with-us"
            className="mt-6 inline-block bg-obsidian px-6 py-3 text-[length:var(--text-xs)] uppercase tracking-label text-vellum transition-colors duration-[var(--motion-base)] hover:bg-ink"
          >
            {nav('listWithUs')}
          </Link>
        </section>
      </main>

      {/* 8 · Footer: markets, intelligence, legal, switchers, desk contact. */}
      <SiteFooter />
    </>
  );
}
