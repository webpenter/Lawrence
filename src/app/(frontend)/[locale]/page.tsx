import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { PropertyCard } from '@/components/property/PropertyCard';
import { Link } from '@/i18n/navigation';
import { getMarketCounts, getFeatured, type Locale } from '@/lib/db';
import type { MarketCount } from '@/lib/db';
import type { Property } from '@/payload-types';
import { HERO_SCRIM, HORIZON_LINE, horizonGradientFor } from '@/tokens/placeholders';

// SSG + ISR 300 s (§10.1).
export const revalidate = 300;

import {
  FALLBACK_DESTINATIONS,
  FALLBACK_FEATURED,
  sampleFallbackEnabled,
} from '@/lib/sample/fallback';

async function safeFeatured(locale: Locale): Promise<Property[]> {
  try {
    // The database answered — an empty featured list is a legitimate state.
    return await getFeatured(6, locale);
  } catch {
    return sampleFallbackEnabled() ? FALLBACK_FEATURED : [];
  }
}

async function safeDestinations(locale: Locale): Promise<MarketCount[]> {
  try {
    return (await getMarketCounts(locale)).slice(0, 8);
  } catch {
    return sampleFallbackEnabled() ? FALLBACK_DESTINATIONS.slice(0, 8) : [];
  }
}

const WATER_TILES = [
  { key: 'waterSea', query: 'water=sea' },
  { key: 'waterLake', query: 'water=lake' },
  { key: 'waterRiverCanal', query: 'water=river,canal' },
  { key: 'waterLagoon', query: 'water=lagoon' },
  { key: 'waterFjord', query: 'water=fjord' },
  { key: 'waterPrivateIslands', query: 'type=private_island' },
] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const ts = await getTranslations('search');
  const nav = await getTranslations('nav');

  const [featured, destinations] = await Promise.all([
    safeFeatured(locale as Locale),
    safeDestinations(locale as Locale),
  ]);

  return (
    <>
      <main>
      {/* 1 · Hero — full-viewport still, scrim, horizon, search bar (§10.1,
          §11.1). min-h-svh so the whole hero (nav → search) fills the first
          screen and Signature properties stays below the fold; svh handles
          mobile browser chrome correctly. */}
      <section className="relative flex min-h-svh flex-col text-vellum">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: horizonGradientFor('waterline-hero') }}
        >
          <div className="absolute inset-x-0 top-[46%] h-px" style={{ background: HORIZON_LINE }} />
          <div className="absolute inset-0" style={{ background: HERO_SCRIM }} />
        </div>
        <SiteHeader onHero />
        {/* Vertical composition: whitespace → headline/desc (upper-middle) →
            flexible gap (mt-auto) → search bar → small bottom spacing. */}
        <div className="relative z-10 flex flex-1 flex-col px-5 pb-6 sm:px-7 sm:pb-8">
          <div className="mt-[6vh] sm:mt-[12vh] md:mt-[15vh]">
            <h1 className="mb-3 max-w-[15ch] font-display text-3xl leading-[1.08] tracking-[-0.02em] sm:mb-4 sm:text-4xl sm:leading-[1.06] md:text-5xl">
              {t('heroTitle')}
            </h1>
            <p className="max-w-[52ch] text-sm leading-relaxed text-vellum/85 md:text-base">
              {t('heroSub')}
            </p>
          </div>
          <form
            action={`/${locale}/search`}
            method="GET"
            className="mt-auto grid items-end border border-vellum/40 bg-vellum/95 text-ink shadow-pop md:grid-cols-[1.4fr_1fr_1fr_auto]"
          >
          <label className="flex flex-col gap-1 border-b border-line p-3 md:border-b-0 md:border-r">
            <span className="text-[length:var(--text-xs)] uppercase tracking-[0.16em] text-graphite">
              {ts('fieldWater')}
            </span>
            <select name="water" className="bg-transparent text-sm text-ink">
              <option value="">{ts('fieldWaterAny')}</option>
              <option value="sea">{t('waterSea')}</option>
              <option value="lake">{t('waterLake')}</option>
              <option value="river,canal">{t('waterRiverCanal')}</option>
              <option value="lagoon">{t('waterLagoon')}</option>
              <option value="fjord">{t('waterFjord')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 border-b border-line p-3 md:border-b-0 md:border-r">
            <span className="text-[length:var(--text-xs)] uppercase tracking-[0.16em] text-graphite">
              {ts('fieldPrice')}
            </span>
            <select name="price" className="bg-transparent text-sm text-ink">
              <option value="">{ts('fieldPriceNoMax')}</option>
              <option value="-5000000">€ ≤ 5M</option>
              <option value="5000000-10000000">€ 5M – 10M</option>
              <option value="10000000-">€ 10M+</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 bg-patina-soft/15 p-3">
            <span className="text-[length:var(--text-xs)] uppercase tracking-[0.16em] text-graphite">
              {ts('fieldBoatLength')}
            </span>
            <input
              type="number"
              name="boatLoa"
              min={0}
              max={120}
              placeholder="24"
              className="bg-transparent text-sm tabular-nums text-ink"
            />
          </label>
          <button
            type="submit"
            className="h-full min-h-12 bg-obsidian px-7 text-xs uppercase tracking-[0.16em] text-vellum"
          >
            {t('searchCta')}
          </button>
          </form>
        </div>
      </section>

      {/* 2 · Signature listings (§10.1). */}
      {featured.length > 0 ? (
        <section className="px-7 py-8">
          <div className="mb-5 flex items-baseline justify-between border-b border-line pb-2.5">
            <h2 className="font-display text-xl text-ink">{t('signatureTitle')}</h2>
            <Link
              href="/search"
              className="text-[length:var(--text-xs)] uppercase tracking-[0.14em] text-patina"
            >
              {ts('pageTitle')} →
            </Link>
          </div>
          <p className="sr-only">{t('signatureSub')}</p>
          <div className="grid gap-5 md:grid-cols-3">
            {featured.map((property, index) => (
              <PropertyCard key={property.id} property={property} priority={index === 0} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 3 · Browse by water (§10.1). */}
      <section className="px-7 py-8">
        <div className="mb-5 flex items-baseline justify-between border-b border-line pb-2.5">
          <h2 className="font-display text-xl text-ink">{t('browseTitle')}</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {WATER_TILES.map((tile) => (
            <Link
              key={tile.key}
              href={`/search?${tile.query}`}
              className="group relative flex aspect-[3/4] items-end overflow-hidden text-vellum"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 transition-transform duration-[var(--motion-slow)] group-hover:scale-105"
                style={{ background: horizonGradientFor(tile.key) }}
              />
              <span
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: HERO_SCRIM }}
              />
              <span className="relative z-10 p-3 text-[length:var(--text-xs)] uppercase tracking-[0.1em]">
                {t(tile.key)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 4 · Destinations with live counts (§10.1). */}
      {destinations.length > 0 ? (
        <section className="px-7 py-8">
          <div className="mb-5 flex items-baseline justify-between border-b border-line pb-2.5">
            <h2 className="font-display text-xl text-ink">{nav('destinations')}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {destinations.map((destination) => (
              <Link
                key={destination.id}
                href={`/markets/${destination.slug}`}
                className="group relative flex aspect-[3/2] items-end overflow-hidden text-vellum"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{ background: horizonGradientFor(destination.slug) }}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{ background: HERO_SCRIM }}
                />
                <span className="relative z-10 p-3 text-[length:var(--text-xs)] uppercase tracking-[0.1em]">
                  {destination.name}
                  <small className="mt-0.5 block normal-case tracking-[0.06em] text-vellum/75">
                    {ts('resultsCount', { count: destination.count })}
                  </small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      </main>

      <SiteFooter />
    </>
  );
}
