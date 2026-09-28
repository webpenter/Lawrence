import type { Metadata } from 'next';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';

import { AnalyticsBeacon } from '@/components/analytics/AnalyticsBeacon';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { FilterPills } from '@/components/search/FilterPills';
import { MapPanel } from '@/components/search/MapPanel';
import type { MapMarker } from '@/components/search/ResultsMap';
import { SearchResultCard } from '@/components/search/SearchResultCard';
import { SortSelect } from '@/components/search/SortSelect';
import { Link } from '@/i18n/navigation';
import { searchProperties, searchPropertiesPostgres } from '@/lib/db';
import type { PropertyFilters } from '@/lib/db/filters';
import { findNarrowestFilter } from '@/lib/db/narrowest-filter';
import {
  activeFilterParams,
  parseSearchParams,
  queryWithout,
  type SearchParams,
} from '@/lib/db/parse-search-params';
import { formatPriceCompact } from '@/lib/intl/format';
import { getViewerPreferences } from '@/lib/intl/preferences';
import type { SearchHit, SearchResult } from '@/lib/search/client';
import { hreflangAlternates } from '@/lib/seo/hreflang';
import { layout } from '@/tokens/layout';

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}

import { fallbackSearch, sampleFallbackEnabled } from '@/lib/sample/fallback';

const EMPTY_RESULT: SearchResult = {
  hits: [],
  total: 0,
  page: 1,
  facets: {},
  engine: 'postgres',
};

async function safeSearch(filters: PropertyFilters): Promise<SearchResult> {
  try {
    // The engine answered: its result is final — a legitimate zero keeps the
    // computed empty state working (§11.3).
    return await searchProperties(filters);
  } catch (err) {
    console.warn('[search-page] search unavailable:', err);
    // DB-error path only, demo mode only — and the demo honours the filters.
    return sampleFallbackEnabled() ? fallbackSearch(filters) : EMPTY_RESULT;
  }
}

async function countWithFilters(filters: PropertyFilters): Promise<number> {
  const result = await searchPropertiesPostgres({ ...filters, limit: 1 });
  return result.total;
}

export async function generateMetadata({ params, searchParams }: SearchPageProps): Promise<Metadata> {
  await params;
  const sp = await searchParams;
  const t = await getTranslations('search');
  const filtered = activeFilterParams(sp).length > 0;
  const page = Number((Array.isArray(sp.page) ? sp.page[0] : sp.page) ?? '1');

  return {
    title: t('pageTitle'),
    // §5.5: only landing pages are indexable representations of filtered
    // inventory; filtered/paginated search is noindex,follow with the
    // canonical pointing at page 1 of the same filter set.
    robots: filtered || page > 1 ? { index: false, follow: true } : undefined,
    alternates: hreflangAlternates('/search'),
  };
}

function markersFrom(hits: SearchHit[], labels: Map<string, string>): MapMarker[] {
  const markers: MapMarker[] = [];
  for (const hit of hits) {
    const geo = hit.location as [number, number] | undefined;
    if (!Array.isArray(geo)) continue;
    markers.push({
      id: hit.id,
      label: labels.get(hit.id) ?? '—',
      lat: geo[0],
      lng: geo[1],
      approximate: hit.approximate === true,
    });
  }
  return markers;
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations('search');
  const viewerLocale = await getLocale();
  const { currency } = await getViewerPreferences();

  const filters = parseSearchParams(sp);
  const limit = filters.limit ?? 24;
  const result = await safeSearch(filters);
  const totalPages = Math.max(1, Math.ceil(result.total / limit));
  const page = filters.page ?? 1;

  // Compact price labels drive both map markers and hover sync. Listings with
  // "price on request" get a circle-style marker (no figure to disclose).
  const priceLabels = new Map<string, string>();
  for (const hit of result.hits) {
    if (typeof hit.priceEur === 'number') {
      priceLabels.set(hit.id, formatPriceCompact(hit.priceEur, currency, viewerLocale));
    }
  }
  const markers = markersFrom(result.hits, priceLabels);

  const narrowest =
    result.total === 0 ? await findNarrowestFilter(sp, countWithFilters) : null;

  const sortOptions = [
    { value: 'newest', label: t('sortNewest') },
    { value: 'price_asc', label: t('sortPriceAsc') },
    { value: 'price_desc', label: t('sortPriceDesc') },
    { value: 'frontage_desc', label: t('sortFrontageDesc') },
  ];

  return (
    <>
      <a
        href="#results-list"
        className="sr-only focus:not-sr-only focus:absolute focus:z-toast focus:bg-vellum focus:p-3"
      >
        {t('skipMap')}
      </a>
      <SiteHeader />
      <main>
      <AnalyticsBeacon
        event="search_performed"
        props={{
          facetsUsed: activeFilterParams(sp),
          resultCount: result.total,
          sort: filters.sort ?? 'newest',
        }}
      />
      <FilterPills params={sp} />
      <div
        className="grid lg:grid-cols-[1.25fr_1fr]"
        style={{ minHeight: layout.searchSplitMinH }}
      >
        <section id="results-list" className="bg-bone px-5 py-4">
          <h1 className="sr-only">{t('pageTitle')}</h1>
          <div className="mb-3 flex items-baseline justify-between gap-4">
            {/* h2 so card titles (h3) keep a valid heading order under the sr-only h1 */}
            <h2 aria-live="polite" className="text-sm font-medium text-ink">
              {t('resultsCount', { count: result.total })}
            </h2>
            {/* Preview .rescount right label — bbox search follows map moves. */}
            <span className="ml-auto mr-3 hidden text-[length:var(--text-xs)] uppercase tracking-[0.18em] text-graphite lg:inline">
              {t('searchAsIMove')} <span aria-hidden="true">✓</span>
            </span>
            <SortSelect
              label={t('sortLabel')}
              options={sortOptions}
              current={filters.sort ?? 'newest'}
            />
          </div>

          {result.hits.length > 0 ? (
            <div className="flex flex-col gap-3">
              {result.hits.map((hit) => (
                <SearchResultCard key={hit.id} hit={hit} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 border border-line bg-vellum p-6">
              <p className="text-sm text-graphite">
                {narrowest
                  ? t('emptyState', {
                      filter: narrowest.params[0] ?? '',
                      count: narrowest.count,
                    })
                  : t('emptyStateNoResults')}
              </p>
              {narrowest ? (
                <Link
                  href={`/search${queryWithout(sp, narrowest.params)}`}
                  className="bg-obsidian px-4 py-2 text-xs uppercase tracking-[0.14em] text-vellum"
                >
                  {t('emptyStateRelax', { filter: narrowest.params[0] ?? '' })}
                </Link>
              ) : (
                <Link href="/search" className="text-xs text-patina underline-offset-2 hover:underline">
                  {t('clearFilters')}
                </Link>
              )}
            </div>
          )}

          {totalPages > 1 ? (
            <nav
              aria-label={t('paginationLabel', { page, total: totalPages })}
              className="mt-4 flex items-center justify-between text-xs"
            >
              {page > 1 ? (
                <Link
                  href={`/search${queryWithout({ ...sp, page: String(page - 1) }, [])}`}
                  className="border border-line px-3 py-1.5 text-graphite hover:bg-vellum"
                >
                  {t('paginationPrev')}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-graphite">{t('paginationLabel', { page, total: totalPages })}</span>
              {page < totalPages ? (
                <Link
                  href={`/search${queryWithout({ ...sp, page: String(page + 1) }, [])}`}
                  className="border border-line px-3 py-1.5 text-graphite hover:bg-vellum"
                >
                  {t('paginationNext')}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </section>

        <aside className="lg:sticky lg:top-0 lg:h-screen">
          <MapPanel
            markers={markers}
            panelLabel={t('mapPanelLabel')}
            unavailableNote={t('mapUnavailable')}
          />
        </aside>
      </div>
      </main>
      <SiteFooter />
    </>
  );
}
