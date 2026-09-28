import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Link } from '@/i18n/navigation';
import { getMarketCounts, type MarketCount, type Locale } from '@/lib/db';
import { hreflangAlternates } from '@/lib/seo/hreflang';
import { HERO_SCRIM, horizonGradientFor } from '@/tokens/placeholders';

// Destination hub (§5.2, §10.5): SSG + ISR.
export const revalidate = 900;

interface HubProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: HubProps): Promise<Metadata> {
  await params;
  const t = await getTranslations('destinations');
  return {
    title: t('hubTitle'),
    description: t('hubSub'),
    alternates: hreflangAlternates('/markets'),
  };
}

async function safeCounts(locale: Locale): Promise<MarketCount[]> {
  try {
    return await getMarketCounts(locale);
  } catch {
    return [];
  }
}

export default async function DestinationsHub({ params }: HubProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('destinations');
  const ts = await getTranslations('search');
  const destinations = await safeCounts(locale as Locale);

  return (
    <>
      <SiteHeader />
      <main className="px-7 py-8">
        <h1 className="mb-2 font-display text-2xl text-ink">{t('hubTitle')}</h1>
        <p className="mb-6 max-w-[62ch] text-sm text-graphite">{t('hubSub')}</p>
        {destinations.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {destinations.map((destination) => (
              <Link
                key={destination.id}
                href={`/markets/${destination.slug}`}
                className="group relative flex aspect-[3/2] items-end overflow-hidden text-vellum"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 transition-transform duration-[var(--motion-slow)] group-hover:scale-105"
                  style={{ background: horizonGradientFor(destination.slug) }}
                />
                <span aria-hidden="true" className="absolute inset-0" style={{ background: HERO_SCRIM }} />
                <span className="relative z-10 p-3 text-[length:var(--text-xs)] uppercase tracking-[0.1em]">
                  {destination.name}
                  <small className="mt-0.5 block normal-case tracking-[0.06em] text-vellum/75">
                    {ts('resultsCount', { count: destination.count })}
                  </small>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="border border-line bg-vellum p-6 text-sm text-graphite">
            {ts('emptyStateNoResults')}
          </p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
