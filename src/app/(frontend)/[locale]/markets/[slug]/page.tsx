import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RichText } from '@payloadcms/richtext-lexical/react';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { MarketStatsTable } from '@/components/market/MarketStatsTable';
import { SearchResultCard } from '@/components/search/SearchResultCard';
import { Link } from '@/i18n/navigation';
import {
  countOffMarketListings,
  getGatedMarkets,
  getMarketBySlug,
  getPublishedSegmentPages,
  getReports,
  searchPropertiesPostgres,
  type Locale,
} from '@/lib/db';
import { formatPriceCompact } from '@/lib/intl/format';
import type { SearchHit } from '@/lib/search/client';
import { breadcrumbJsonLd, datasetJsonLd, faqPageJsonLd } from '@/lib/seo/jsonld';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { marketPassesGate } from '@/lib/seo/segments';
import type { Market, Report, SegmentPage } from '@/payload-types';
import { HERO_SCRIM, horizonGradientFor } from '@/tokens/placeholders';
import { layout } from '@/tokens/layout';

// §5.5 market pages: SSG over gated markets + ISR.
export const revalidate = 900;

interface MarketPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const markets = await getGatedMarkets('en', 100, true);
    return markets.map((market) => ({ slug: market.slug }));
  } catch {
    return [];
  }
}

/** §5.5 gate: published editorial copy plus three sourced data points, or 404. */
async function loadMarket(slug: string, locale: string): Promise<Market | null> {
  try {
    const market = await getMarketBySlug(slug, locale as Locale);
    if (!market || !marketPassesGate(market)) return null;
    return market;
  } catch (err) {
    console.warn('[market] load failed, treating as not found:', err);
    return null;
  }
}

export async function generateMetadata({ params }: MarketPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const market = await loadMarket(slug, locale);
  if (!market) return {};
  const t = await getTranslations('destinations');

  // §12.4 templates; a hand-written metaDescription always wins.
  let description = market.metaDescription ?? null;
  if (!description) {
    const prime = market.stats?.primeEntryEur;
    const yoy = market.stats?.yoyChangePct;
    if (prime?.value != null && prime.source && prime.asOfDate && yoy?.value != null) {
      let count = 0;
      try {
        count = (await searchPropertiesPostgres({ marketId: market.id, limit: 1 })).total;
      } catch {
        // count reads as zero
      }
      description = t('metaDescription', {
        primeEntry: formatPriceCompact(prime.value, 'EUR', locale),
        yoy: `${yoy.value > 0 ? '+' : ''}${yoy.value.toFixed(1)}%`,
        asOfDate: new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(
          new Date(prime.asOfDate),
        ),
        count,
      });
    } else {
      description = t('metaDescriptionNoCount', { destination: market.name });
    }
  }

  return buildPageMetadata({
    title: market.metaTitle ?? t('metaTitle', { destination: market.name }),
    description,
    path: `/markets/${slug}`,
    locale,
    ogImage: `/api/og/market/${slug}`,
    // Rule 8: sample content is noindexed and out of sitemaps.
    ...(market.isSample ? { robots: { index: false, follow: false } } : {}),
  });
}

export default async function MarketPage({ params }: MarketPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const market = await loadMarket(slug, locale);
  if (!market) notFound();

  const t = await getTranslations('destinations');
  const tSeg = await getTranslations('segments');
  const tl = await getTranslations('listing');

  let listings: SearchHit[] = [];
  let listingsTotal = 0;
  let offMarketCount = 0;
  let segmentPages: SegmentPage[] = [];
  let reports: Report[] = [];
  try {
    const [search, offMarket, segments, allReports] = await Promise.all([
      searchPropertiesPostgres({ marketId: market.id, limit: 12 }),
      countOffMarketListings(),
      getPublishedSegmentPages(locale as Locale),
      getReports(locale as Locale, 10),
    ]);
    listings = search.hits;
    listingsTotal = search.total;
    offMarketCount = offMarket;
    segmentPages = segments;
    reports = allReports;
  } catch {
    // Degrade to the editorial shell.
  }

  // §11.5 block 6 — related markets and segments, 6–10 internal links.
  const marketId = (page: SegmentPage): number | undefined => {
    const m = page.market;
    return m == null ? undefined : typeof m === 'object' ? m.id : m;
  };
  const ownSegments = segmentPages.filter((page) => marketId(page) === market.id);
  const relatedMarkets = (market.relatedMarkets ?? [])
    .map((entry) => (typeof entry === 'object' ? entry : null))
    .filter((entry): entry is Market => entry != null)
    .slice(0, Math.max(0, 10 - ownSegments.length));

  // §11.5 block 8 — cross-link to the relevant report.
  const report =
    reports.find((entry) =>
      (entry.markets ?? []).some(
        (m) => (typeof m === 'object' ? m.id : m) === market.id,
      ),
    ) ?? reports[0] ?? null;

  const faq = (market.faq ?? []).filter((entry) => entry.question && entry.answer);

  const statsApiPath = `/api/public/markets/${market.slug}/stats`;
  const jsonLd = [
    breadcrumbJsonLd(locale, [
      { name: tl('breadcrumbHome'), path: '' },
      { name: t('hubTitle'), path: '/markets' },
      { name: market.name, path: `/markets/${slug}` },
    ]),
    datasetJsonLd({
      name: `${market.name} — ${t('statsTitle')}`,
      description: market.answer ?? t('metaDescriptionNoCount', { destination: market.name }),
      url: `/${locale}/markets/${slug}`,
      dataUrl: statsApiPath,
      dateModified: market.updatedAt,
    }),
    faqPageJsonLd(faq.map((entry) => ({ question: entry.question, answer: entry.answer }))),
  ].filter((entry): entry is NonNullable<typeof entry> => entry != null);

  return (
    <>
      <SiteHeader />
      {jsonLd.map((entry, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
        />
      ))}
      <main>
        <div
          className="relative flex items-end text-vellum"
          style={{ minHeight: layout.heroMinH }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: horizonGradientFor(market.slug) }}
          />
          <span aria-hidden="true" className="absolute inset-0" style={{ background: HERO_SCRIM }} />
          <h1 className="relative z-10 px-7 pb-7 font-display text-3xl tracking-[-0.02em]">
            {market.name}
          </h1>
        </div>

        {market.isSample ? (
          <p className="mx-7 mt-6 inline-block bg-patina-soft px-2 py-0.5 text-[length:var(--text-xs)] font-medium uppercase tracking-[0.14em] text-ink">
            {t('sampleNotice')}
          </p>
        ) : null}

        {/* §11.5 block 1 — the answer-first editorial introduction. */}
        <section className="max-w-[74ch] px-7 pb-2 pt-6">
          {market.answer ? (
            <p className="mb-4 font-display text-lg leading-relaxed text-ink">{market.answer}</p>
          ) : null}
          {market.intro ? (
            <div className="text-sm leading-relaxed text-graphite">
              <RichText data={market.intro} />
            </div>
          ) : null}
        </section>

        {/* §11.5 block 2 — the sourced statistics table. */}
        <section className="max-w-3xl px-7 py-5">
          <h2 className="mb-3 font-display text-xl text-ink">{t('statsTitle')}</h2>
          <MarketStatsTable market={market} locale={locale} />
        </section>

        {/* §11.5 block 3 — available listings. */}
        {listings.length > 0 ? (
          <section className="px-7 py-5">
            <h2 className="mb-3 font-display text-xl text-ink">{t('listingsTitle')}</h2>
            <div className="flex flex-col gap-3">
              {listings.map((hit) => (
                <SearchResultCard key={hit.id} hit={hit} />
              ))}
            </div>
            {listingsTotal > listings.length ? (
              <p className="mt-4">
                <Link href="/collection" className="text-sm text-patina underline">
                  {t('viewAllCta')}
                </Link>
              </p>
            ) : null}
          </section>
        ) : null}

        {/* §11.5 block 4 — the off-market count with the join action. */}
        {offMarketCount > 0 ? (
          <section className="mx-7 my-5 max-w-3xl border border-line bg-obsidian px-6 py-7 text-vellum">
            <h2 className="mb-2 font-display text-xl">{t('offMarketTitle')}</h2>
            <p className="mb-4 max-w-[60ch] text-sm leading-relaxed opacity-80">
              {t('offMarketBody', { count: offMarketCount })}
            </p>
            <Link
              href="/join"
              className="inline-block border border-vellum px-5 py-2.5 text-xs uppercase tracking-label hover:bg-vellum hover:text-obsidian"
            >
              {t('offMarketCta')}
            </Link>
          </section>
        ) : null}

        {/* §11.5 block 5 — buying notes: factual, sourced, never advice. */}
        {market.buyingNotes ? (
          <section className="max-w-[74ch] px-7 py-5">
            <h2 className="mb-3 font-display text-xl text-ink">{t('buyingNotesTitle')}</h2>
            <div className="text-sm leading-relaxed text-graphite">
              <RichText data={market.buyingNotes} />
            </div>
          </section>
        ) : null}

        {/* §11.5 block 6 — related markets and segments, 6–10 internal links. */}
        {ownSegments.length > 0 || relatedMarkets.length > 0 ? (
          <nav aria-label={t('relatedTitle')} className="px-7 py-5">
            <h2 className="mb-3 font-display text-lg text-ink">{t('relatedTitle')}</h2>
            <div className="flex flex-wrap gap-2">
              {ownSegments.map((page) => (
                <Link
                  key={`segment-${page.id}`}
                  href={`/markets/${market.slug}/${page.segment}`}
                  className="border border-line px-3 py-1.5 text-xs text-patina hover:bg-bone"
                >
                  {tSeg(page.segment)}
                </Link>
              ))}
              {relatedMarkets.map((related) => (
                <Link
                  key={`market-${related.id}`}
                  href={`/markets/${related.slug}`}
                  className="border border-line px-3 py-1.5 text-xs text-patina hover:bg-bone"
                >
                  {related.name}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}

        {/* §11.5 block 7 — FAQ with FAQPage JSON-LD (emitted above). */}
        {faq.length > 0 ? (
          <section className="max-w-[74ch] px-7 py-5">
            <h2 className="mb-3 font-display text-xl text-ink">{t('faqTitle')}</h2>
            {faq.map((entry, index) => (
              <details key={entry.id ?? index} className="border-b border-line py-3">
                <summary className="cursor-pointer text-sm font-medium text-ink">
                  {entry.question}
                </summary>
                <p className="pt-2 text-sm leading-relaxed text-graphite">{entry.answer}</p>
              </details>
            ))}
          </section>
        ) : null}

        {/* §11.5 block 8 — cross-link to the relevant report. */}
        {report ? (
          <section className="mx-7 my-5 max-w-3xl border border-line bg-vellum px-6 py-6">
            <p className="mb-1 text-[length:var(--text-xs)] uppercase tracking-label text-graphite">
              {t('reportTitle')}
            </p>
            <h2 className="mb-3 font-display text-lg text-ink">{report.title}</h2>
            <Link href={`/intelligence/${report.slug}`} className="text-sm text-patina underline">
              {t('reportCta')}
            </Link>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
