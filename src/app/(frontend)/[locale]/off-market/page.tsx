import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { FilterPills } from '@/components/search/FilterPills';
import { MapPanel } from '@/components/search/MapPanel';
import type { MapMarker } from '@/components/search/ResultsMap';
import { SearchResultCard } from '@/components/search/SearchResultCard';
import { SortSelect } from '@/components/search/SortSelect';
import { Link } from '@/i18n/navigation';
import { searchOffMarketListings } from '@/lib/db';
import {
  parseSearchParams,
  queryWithout,
  type SearchParams,
} from '@/lib/db/parse-search-params';
import { formatPriceCompact } from '@/lib/intl/format';
import { getViewerPreferences } from '@/lib/intl/preferences';
import { layout } from '@/tokens/layout';
import { getCurrentViewer } from '@/lib/auth';
import { isActiveMember } from '@/lib/access/viewer';
import type { SearchHit } from '@/lib/search/client';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Off-Market',
    robots: { index: false, follow: false },
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

export default async function OffMarketPage(props: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const viewer = await getCurrentViewer();
  if (!isActiveMember(viewer) && viewer.kind !== 'staff') {
    redirect(`/${locale}/join`);
  }

  const sp = await props.searchParams;
  const t = await getTranslations('search');
  const tOff = await getTranslations('offMarket');
  const viewerLocale = await getLocale();
  const { currency } = await getViewerPreferences();

  const filters = parseSearchParams(sp);
  const limit = filters.limit ?? 24;
  const result = await searchOffMarketListings(viewer, filters);
  const totalPages = Math.max(1, Math.ceil(result.total / limit));
  const page = filters.page ?? 1;

  const priceLabels = new Map<string, string>();
  for (const hit of result.hits) {
    if (typeof hit.priceEur === 'number') {
      priceLabels.set(hit.id, formatPriceCompact(hit.priceEur, currency, viewerLocale));
    }
  }
  const markers = markersFrom(result.hits, priceLabels);

  const sortOptions = [
    { value: 'newest', label: t('sortNewest') },
    { value: 'price_asc', label: t('sortPriceAsc') },
    { value: 'price_desc', label: t('sortPriceDesc') },
  ];

  return (
    <>
      <SiteHeader />
      <main>
        <div className="bg-obsidian text-vellum px-5 py-8">
          <div className="max-w-4xl">
            <h1 className="font-display text-4xl mb-4">{tOff('indexTitle')}</h1>
            <p className="text-sm opacity-80">{tOff('indexSub')}</p>
          </div>
        </div>
        
        <FilterPills params={sp} />
        
        <div className="grid lg:grid-cols-[1.25fr_1fr]" style={{ minHeight: layout.searchSplitMinH }}>
          <section id="results-list" className="bg-bone px-5 py-4">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 aria-live="polite" className="text-sm font-medium text-ink">
                {t('resultsCount', { count: result.total })}
              </h2>
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
                <p className="text-sm text-graphite">{tOff('emptyState')}</p>
                <Link href="/off-market" className="text-xs text-patina underline-offset-2 hover:underline">
                  {t('clearFilters')}
                </Link>
              </div>
            )}
            
            {totalPages > 1 ? (
              <nav
                aria-label={t('paginationLabel', { page, total: totalPages })}
                className="mt-4 flex items-center justify-between text-xs"
              >
                {page > 1 ? (
                  <Link
                    href={`/off-market${queryWithout({ ...sp, page: String(page - 1) }, [])}`}
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
                    href={`/off-market${queryWithout({ ...sp, page: String(page + 1) }, [])}`}
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
