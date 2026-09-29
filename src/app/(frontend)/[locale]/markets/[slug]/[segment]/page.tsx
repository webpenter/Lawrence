import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RichText } from '@payloadcms/richtext-lexical/react';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { MarketStatsTable } from '@/components/market/MarketStatsTable';
import { SearchResultCard } from '@/components/search/SearchResultCard';
import { Link } from '@/i18n/navigation';
import {
  getMarketBySlug,
  getPublishedSegmentPages,
  getSegmentPage,
  searchPropertiesPostgres,
  type Locale,
} from '@/lib/db';
import type { SearchHit } from '@/lib/search/client';
import { breadcrumbJsonLd, faqPageJsonLd } from '@/lib/seo/jsonld';
import { buildPageMetadata } from '@/lib/seo/metadata';
import {
  normalizeSegmentSlug,
  rankSegmentSiblings,
  segmentPagePassesGate,
  segmentToFilters,
  type Segment,
} from '@/lib/seo/segments';
import type { Market, SegmentPage } from '@/payload-types';

// §5.5 market × segment pages: ISR over the published, gated combinations.
export const revalidate = 900;

interface SegmentPageProps {
  params: Promise<{ locale: string; slug: string; segment: string }>;
}

interface Loaded {
  market: Market;
  page: SegmentPage;
  segment: Segment;
}

/**
 * Resolve + gate: the alias resolver 301s off-canonical spellings, and a
 * combination renders only with published editorial copy plus the market's
 * three sourced data points (§5.5). Everything else is a 404.
 */
async function load(slug: string, rawSegment: string, locale: string): Promise<Loaded | null> {
  const segment = normalizeSegmentSlug(rawSegment);
  if (!segment) return null;
  try {
    const market = await getMarketBySlug(slug, locale as Locale);
    if (!market) return null;
    const page = await getSegmentPage(market.id, segment, locale as Locale);
    if (!page || !segmentPagePassesGate(page, market)) return null;
    return { market, page, segment };
  } catch (err) {
    console.warn('[segment] load failed, treating as not found:', err);
    return null;
  }
}

export async function generateMetadata({ params }: SegmentPageProps): Promise<Metadata> {
  const { locale, slug, segment: rawSegment } = await params;
  const loaded = await load(slug, rawSegment, locale);
  if (!loaded) return {};
  const t = await getTranslations('destinations');
  const tSeg = await getTranslations('segments');

  let count = 0;
  try {
    count = (
      await searchPropertiesPostgres({ ...segmentToFilters(loaded.segment, loaded.market.id), limit: 1 })
    ).total;
  } catch {
    // count reads as zero
  }

  // §12.4: "{SegmentPlural} in {Market} — {count} for sale".
  const title =
    loaded.page.metaTitle ??
    (count > 0
      ? t('segmentMetaTitle', {
          segment: tSeg(loaded.segment),
          destination: loaded.market.name,
          count,
        })
      : t('segmentMetaTitleNoCount', {
          segment: tSeg(loaded.segment),
          destination: loaded.market.name,
        }));

  return buildPageMetadata({
    title,
    description: loaded.page.metaDescription,
    path: `/markets/${slug}/${loaded.segment}`,
    locale,
    ogImage: `/api/og/market/${slug}`,
    // Rule 8: sample content is noindexed and out of sitemaps.
    ...(loaded.page.isSample || loaded.market.isSample
      ? { robots: { index: false, follow: false } }
      : {}),
  });
}

export default async function MarketSegmentPage({ params }: SegmentPageProps) {
  const { locale, slug, segment: rawSegment } = await params;
  setRequestLocale(locale);

  // The §5.5 alias resolver: off-canonical spellings 301 before gating.
  const canonicalSegment = normalizeSegmentSlug(rawSegment);
  if (canonicalSegment && canonicalSegment !== rawSegment) {
    permanentRedirect(`/${locale}/markets/${slug}/${canonicalSegment}`);
  }

  const loaded = await load(slug, rawSegment, locale);
  if (!loaded) notFound();
  const { market, page, segment } = loaded;

  const t = await getTranslations('destinations');
  const tSeg = await getTranslations('segments');
  const tl = await getTranslations('listing');

  let listings: SearchHit[] = [];
  let siblings: SegmentPage[] = [];
  try {
    const [search, published] = await Promise.all([
      searchPropertiesPostgres({ ...segmentToFilters(segment, market.id), limit: 12 }),
      getPublishedSegmentPages(locale as Locale),
    ]);
    listings = search.hits;
    siblings = rankSegmentSiblings(page, published, 8);
  } catch {
    // Degrade to the editorial shell.
  }

  const faq = (page.faq ?? []).filter((entry) => entry.question && entry.answer);
  const jsonLd = [
    breadcrumbJsonLd(locale, [
      { name: tl('breadcrumbHome'), path: '' },
      { name: t('hubTitle'), path: '/markets' },
      { name: market.name, path: `/markets/${market.slug}` },
      { name: tSeg(segment), path: `/markets/${market.slug}/${segment}` },
    ]),
    faqPageJsonLd(faq.map((entry) => ({ question: entry.question, answer: entry.answer }))),
  ].filter((entry): entry is NonNullable<typeof entry> => entry != null);

  const siblingMarket = (entry: SegmentPage): Market | null => {
    const m = entry.market;
    return typeof m === 'object' ? m : null;
  };

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
        <header className="border-b border-line px-7 pb-6 pt-10">
          {page.isSample || market.isSample ? (
            <p className="mb-3 inline-block bg-patina-soft px-2 py-0.5 text-[length:var(--text-xs)] font-medium uppercase tracking-[0.14em] text-ink">
              {t('sampleNotice')}
            </p>
          ) : null}
          <p className="mb-1 text-[length:var(--text-xs)] uppercase tracking-label text-graphite">
            {t('segmentKicker')} · {market.name}
          </p>
          <h1 className="font-display text-3xl tracking-[-0.02em] text-ink">{page.title}</h1>
        </header>

        {page.intro ? (
          <section className="max-w-[74ch] px-7 pb-2 pt-6 text-sm leading-relaxed text-graphite">
            <RichText data={page.intro} />
          </section>
        ) : null}

        <section className="max-w-3xl px-7 py-5">
          <h2 className="mb-3 font-display text-xl text-ink">{t('statsTitle')}</h2>
          <MarketStatsTable market={market} locale={locale} />
        </section>

        {listings.length > 0 ? (
          <section className="px-7 py-5">
            <h2 className="mb-3 font-display text-xl text-ink">{t('listingsTitle')}</h2>
            <div className="flex flex-col gap-3">
              {listings.map((hit) => (
                <SearchResultCard key={hit.id} hit={hit} />
              ))}
            </div>
          </section>
        ) : null}

        {page.body ? (
          <section className="max-w-[74ch] px-7 py-5 text-sm leading-relaxed text-graphite">
            <RichText data={page.body} />
          </section>
        ) : null}

        {siblings.length > 0 ? (
          <nav aria-label={t('relatedTitle')} className="px-7 py-5">
            <h2 className="mb-3 font-display text-lg text-ink">{t('relatedTitle')}</h2>
            <div className="flex flex-wrap gap-2">
              {siblings.map((entry) => {
                const m = siblingMarket(entry);
                if (!m) return null;
                return (
                  <Link
                    key={entry.id}
                    href={`/markets/${m.slug}/${entry.segment}`}
                    className="border border-line px-3 py-1.5 text-xs text-patina hover:bg-bone"
                  >
                    {entry.title}
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : null}

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
      </main>
      <SiteFooter />
    </>
  );
}
