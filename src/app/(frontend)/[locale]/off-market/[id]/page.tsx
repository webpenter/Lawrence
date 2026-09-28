import type { Viewer } from '@/lib/access/viewer';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { RichText } from '@payloadcms/richtext-lexical/react';

import { AnalyticsBeacon } from '@/components/analytics/AnalyticsBeacon';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { EnquiryForm } from '@/components/property/EnquiryForm';
import { MapLocality } from '@/components/property/MapLocality';
import { MarketStatStrip } from '@/components/property/MarketStatStrip';
import { SaveCta } from '@/components/property/SaveCta';
import { GalleryGrid } from '@/components/property/GalleryGrid';
import { PropertyCard } from '@/components/property/PropertyCard';
import { ViewBeacon } from '@/components/property/ViewBeacon';
import { humanizeEnum } from '@/lib/humanize';
import { Badge } from '@/components/ui/Badge';
import { Link } from '@/i18n/navigation';
import { getOffMarketListing, getPayloadClient, type Locale } from '@/lib/db';
import { sanitizePropertyForPublic } from '@/lib/db/sanitize';
import { formatArea, formatPriceEur } from '@/lib/intl/format';
import { getViewerPreferences } from '@/lib/intl/preferences';
import { getCurrentViewer } from '@/lib/auth';
import { createSignedAssetToken } from '@/lib/media/signed-url';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { breadcrumbJsonLd, realEstateListingJsonLd } from '@/lib/seo/jsonld';
import { findFallbackProperty, sampleFallbackEnabled } from '@/lib/sample/fallback';
import { listingPrice } from '@/lib/intl/listing-price';
import { rankSimilar, similarCandidatesWhere } from '@/lib/similar';
import type { Agency, Agent, Property } from '@/payload-types';

export const dynamic = 'force-dynamic';

interface DetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

async function loadProperty(viewer: Viewer, id: string, locale: string): Promise<Property | null> {
  try {
    return await getOffMarketListing(viewer, id, locale as Locale);
  } catch (err) {
    console.warn('[property-page] load failed:', err);
    // DB-error path only, demo mode only, exact id only (§13.12).
    const fallback = sampleFallbackEnabled() ? findFallbackProperty(id) : null;
    if (fallback) return fallback;
    // No fallback match: this was a DB *error*, not a "id not found". Never
    // let a transient DB failure become a notFound() — ISR caches 404s for up
    // to `stale-while-revalidate` (24h), poisoning valid listings. Re-throw so
    // Next.js keeps serving the last good cached page and retries, instead of
    // baking a false 404 into the cache.
    throw err;
  }
}

async function loadSimilar(property: Property): Promise<Property[]> {
  try {
    const payload = await getPayloadClient();
    const res = await payload.find({
      collection: 'properties',
      where: similarCandidatesWhere(property),
      limit: 24,
      depth: 1,
    });
    return rankSimilar(property, res.docs.map(sanitizePropertyForPublic), 3);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const viewer = await getCurrentViewer();
  const { locale, id } = await params;
  const property = await loadProperty(viewer, id, locale);
  if (!property) return {};

  // §12.4 meta template: {propertyType} for sale in {locality} — trophy property from €20M.
  const parts = [
    property.title,
    '—',
    humanizeEnum(property.propertyType),
    property.location?.locality ? `in ${property.location.locality}` : null,
  ].filter(Boolean);

  // §11.4 description template from structured fields when no manual meta.
  const generatedDescription = [
    property.bedrooms != null ? `${property.bedrooms} bedrooms` : null,
    property.builtAreaSqm != null ? `${property.builtAreaSqm} m²` : null,
    property.waterfront?.waterFrontageM != null
      ? `${property.waterfront.waterFrontageM} m of private water frontage`
      : null,
    property.location?.locality ? `in ${property.location.locality}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  // §5.3/§8.2: off-market is ALWAYS noindex and never has an OG image.
  return buildPageMetadata({
    title: property.metaTitle ?? parts.join(' '),
    description: property.metaDescription ?? generatedDescription ?? property.subtitle,
    path: `/off-market/${id}`,
    locale,
    robots: { index: false, follow: false },
  });
}

export default async function OffMarketDetailPage({ params }: DetailPageProps) {
  const viewer = await getCurrentViewer();
  const { locale, id } = await params;
  setRequestLocale(locale);

  // Prompt 9 gate: an anonymous request to an off-market listing is a 404 —
  // never a redirect, never a hint that the id exists (§8.6).
  const property = await loadProperty(viewer, id, locale);
  if (!property) notFound();

  const t = await getTranslations('listing');
  const tc = await getTranslations('common');
  const ta = await getTranslations('account');
  const viewerLocale = await getLocale();
  const { currency, units } = await getViewerPreferences();
  const similar = await loadSimilar(property);

  const agency =
    typeof property.agency === 'object' && property.agency !== null
      ? (property.agency as Agency)
      : null;
  const agent =
    typeof property.agent === 'object' && property.agent !== null
      ? (property.agent as Agent)
      : null;

  const priced = listingPrice(property);
  const price =
    priced.kind === 'exact'
      ? formatPriceEur(priced.priceEur, currency, viewerLocale)
      : priced.kind === 'band'
        ? tc('priceGuideBand', { min: priced.minM, max: priced.maxM })
        : property.status === 'sold'
          ? null
          : tc('priceOnRequest');

  const locality = [
    property.location?.locality,
    property.location?.region,
    property.location?.country,
  ]
    .filter(Boolean)
    .join(' · ');

  const facts: Array<[string, string]> = [];
  if (property.bedrooms != null) facts.push([t('factBedrooms'), String(property.bedrooms)]);
  if (property.bathrooms != null) facts.push([t('factBathrooms'), String(property.bathrooms)]);
  if (property.receptionRooms != null)
    facts.push([t('factReceptions'), String(property.receptionRooms)]);
  if (property.builtAreaSqm != null)
    facts.push([t('factBuiltArea'), formatArea(property.builtAreaSqm, units, viewerLocale)]);
  if (property.plotAreaSqm != null)
    facts.push([t('factPlotArea'), formatArea(property.plotAreaSqm, units, viewerLocale)]);
  if (property.terraceAreaSqm != null)
    facts.push([t('factTerrace'), formatArea(property.terraceAreaSqm, units, viewerLocale)]);
  if (property.yearBuilt != null) facts.push([t('factYearBuilt'), String(property.yearBuilt)]);
  if (property.renovatedYear != null)
    facts.push([t('factRenovated'), String(property.renovatedYear)]);
  if (property.architect) facts.push([t('factArchitect'), property.architect]);
  if (property.heritageStatus && property.heritageStatus !== 'none')
    facts.push([t('factHeritage'), humanizeEnum(property.heritageStatus)]);
  if (property.condition) facts.push([t('factCondition'), humanizeEnum(property.condition)]);
  if (property.tenure) facts.push([t('factTenure'), humanizeEnum(property.tenure)]);

  const stateNotice =
    property.status === 'sold'
      ? t('soldNotice')
      : property.status === 'expired'
        ? t('expiredNotice')
        : property.status === 'under_offer'
          ? t('underOfferNotice')
          : null;

  const market =
    typeof property.location?.market === 'object' && property.location?.market !== null
      ? property.location.market
      : null;
  const coords = property.location?.coordinates as [number, number] | null | undefined;
  const mapPoint = Array.isArray(coords) ? coords : null;
  const ts = await getTranslations('search');

  // §8.6: member documents are addressed ONLY by short-lived signed URLs.
  const signedDocuments =
    viewer.kind === 'member'
      ? [...(property.floorplans ?? []), ...(property.documents ?? [])]
          .filter(
            (docItem): docItem is Exclude<typeof docItem, number> =>
              typeof docItem === 'object' && docItem !== null,
          )
          .map((docItem) => ({
            id: docItem.id,
            title: docItem.title ?? String(docItem.id),
            href: `/api/secure/document/${createSignedAssetToken('document', docItem.id, viewer.id)}`,
          }))
      : [];

  const jsonLd = [
    realEstateListingJsonLd(property, locale),
    breadcrumbJsonLd(locale, [
      { name: t('breadcrumbHome'), path: '' },
      { name: t('breadcrumbSearch'), path: '/collection' },
      { name: property.title, path: `/off-market/${id}` },
    ]),
  ];

  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ViewBeacon propertyId={property.id} />
      <AnalyticsBeacon
        event="listing_viewed"
        props={{
          propertyId: property.id,
          valueTier: property.valueTier ?? undefined,
          priceBand:
            property.priceEur != null
              ? property.priceEur < 1_000_000
                ? 'lt_1m'
                : property.priceEur < 5_000_000
                  ? '1m_5m'
                  : property.priceEur < 10_000_000
                    ? '5m_10m'
                    : 'gte_10m'
              : 'on_request',
        }}
      />
      <main>

      {property.isSample ? (
        <p className="bg-patina-soft px-4 sm:px-7 py-2 text-center text-xs uppercase tracking-[0.12em] text-obsidian">
          {t('sampleBadge')}
        </p>
      ) : null}
      
      <p className="bg-obsidian px-4 sm:px-7 py-2.5 text-center text-xs text-vellum">
        {await getTranslations('offMarket').then(t => t('confidentialityNote'))}
      </p>

      {stateNotice ? (
        <p className="bg-obsidian px-4 sm:px-7 py-2.5 text-center text-xs uppercase tracking-[0.12em] text-vellum">
          {stateNotice}
        </p>
      ) : null}

      <GalleryGrid property={property} />

      <header className="grid gap-3 border-b border-line px-4 pb-5 pt-6 sm:px-7 md:grid-cols-[1fr_auto] md:items-end md:gap-6">
        <div>
          <p className="text-[length:var(--text-xs)] uppercase tracking-[0.18em] text-graphite">
            {locality}
            {property.reference ? ` · ${t('factReference')} ${property.reference}` : ''}
          </p>
          <h1 className="mb-1 mt-1.5 font-display text-2xl leading-[1.12] text-ink md:text-2xl">
            {property.title}
          </h1>
          {property.subtitle ? (
            <p className="text-xs text-graphite">{property.subtitle}</p>
          ) : null}
          {/* Preview .ltitle .loc: "6 bedrooms · 5 bathrooms · 740 m² · plot 2,100 m² · built 1964, renovated 2021" */}
          <p className="mt-1 text-xs text-graphite">
            {[
              property.bedrooms != null ? t('locBedrooms', { n: property.bedrooms }) : null,
              property.bathrooms != null ? t('locBathrooms', { n: property.bathrooms }) : null,
              property.builtAreaSqm != null
                ? formatArea(property.builtAreaSqm, units, viewerLocale)
                : null,
              property.plotAreaSqm != null
                ? t('locPlot', { area: formatArea(property.plotAreaSqm, units, viewerLocale) })
                : null,
              property.yearBuilt != null
                ? property.renovatedYear != null
                  ? `${t('locBuilt', { year: property.yearBuilt })}, ${t('locRenovated', { year: property.renovatedYear })}`
                  : t('locBuilt', { year: property.yearBuilt })
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex items-center gap-4 md:justify-end">
          {price ? (
            <p className="font-display text-2xl tabular-nums text-ink md:text-right">{price}</p>
          ) : null}
          <SaveCta
            propertyId={property.id}
            saveLabel={ta('savedTitle')}
            savedLabel={ta('savedTitle')}
            joinHref={`/${locale}/join`}
          />
        </div>
      </header>

      <div className="grid gap-8 px-4 py-6 sm:px-7 lg:grid-cols-[1.5fr_1fr]">
        <div>
          {facts.length > 0 ? (
            <section className="mt-6">
              <h2 className="mb-3 font-display text-lg text-ink">{t('keyFactsTitle')}</h2>
              <dl className="grid grid-cols-2 gap-x-6 md:grid-cols-3">
                {facts.map(([label, value]) => (
                  <div key={label} className="border-b border-line py-2">
                    <dt className="text-[length:var(--text-xs)] uppercase tracking-[0.14em] text-graphite">
                      {label}
                    </dt>
                    <dd className="text-sm tabular-nums text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {property.highlights?.length ? (
            <section className="mt-6">
              <h2 className="mb-3 font-display text-lg text-ink">{t('highlightsTitle')}</h2>
              <ul className="list-disc pl-5 text-sm text-graphite">
                {property.highlights.map((highlight) => (
                  <li key={highlight.id ?? highlight.text}>{highlight.text}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {property.description ? (
            <section className="prose-waterline mt-6 max-w-prose text-sm text-graphite">
              <RichText data={property.description} />
            </section>
          ) : null}

          {property.provenance ? (
            <section className="mt-6">
              <h2 className="mb-3 font-display text-lg text-ink">{t('provenanceTitle')}</h2>
              <div className="prose-waterline max-w-prose text-sm text-graphite">
                <RichText data={property.provenance} />
              </div>
            </section>
          ) : null}

          {mapPoint ? (
            <MapLocality
              lng={mapPoint[0]}
              lat={mapPoint[1]}
              approximate={property.location?.coordinatePrecision !== 'exact'}
              label={locality || null}
              panelLabel={ts('mapPanelLabel')}
              unavailableNote={ts('mapUnavailable')}
            />
          ) : null}

          {property.features?.length ? (
            <section className="mt-6">
              <h2 className="mb-3 font-display text-lg text-ink">{t('featuresTitle')}</h2>
              <div className="flex flex-wrap gap-1.5">
                {property.features.map((feature) => (
                  <Badge key={feature} tone="neutral">
                    {humanizeEnum(feature)}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          {market ? (
            <MarketStatStrip
              market={market}
              heading={t('marketContextTitle')}
              labels={{
                primeEntryEur: t('statPrimeEntry'),
                medianPriceEurPerSqm: t('statMedianSqm'),
                yoyChangePct: t('statYoY'),
                avgDaysOnMarket: t('statDays'),
              }}
            />
          ) : null}

        </div>

        <aside>
          {signedDocuments.length > 0 ? (
            <section className="mb-6 border border-line bg-vellum p-5">
              <h2 className="mb-3 font-display text-lg text-ink">{t('documentsTitle')}</h2>
              <ul className="flex flex-col gap-2">
                {signedDocuments.map((docItem) => (
                  <li key={docItem.id}>
                    <a
                      href={docItem.href}
                      className="text-sm text-ink underline decoration-patina underline-offset-4 hover:decoration-ink"
                    >
                      {docItem.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="border border-line bg-vellum p-5">
            {agency ? (
              <div className="mb-4 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-7 items-center justify-center rounded-sm bg-obsidian font-display text-sm text-vellum"
                >
                  {(agent?.name ?? agency.name).slice(0, 1)}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{agent?.name ?? agency.name}</p>
                  <p className="text-[length:var(--text-xs)] uppercase tracking-[0.14em] text-graphite">
                    {agency.name}
                    {agency.verified ? ` · ${t('verifiedAgency')}` : ''}
                  </p>
                </div>
              </div>
            ) : null}
            <h2 className="mb-1 font-display text-lg text-ink">{t('enquiryCta')}</h2>
            <p className="mb-4 text-xs text-graphite">{t('enquirySub')}</p>
            <EnquiryForm
              propertyId={property.id}
              locale={locale}
              labels={{
                name: t('formName'),
                email: t('formEmail'),
                phone: t('formPhone'),
                message: t('formMessage'),
                consent: t('enquiryConsent'),
                submit: t('formSubmit'),
                sending: t('formSending'),
                success: t('formSuccess'),
                error: t('formError'),
                consentRequired: t('formConsentRequired'),
                errorSummary: t('formErrorSummary'),
                errorName: t('formErrorName'),
                errorEmail: t('formErrorEmail'),
              }}
            />
            {agent?.whatsapp || agency?.whatsapp ? (
              <TrackedLink
                event="whatsapp_clicked"
                eventProps={{ propertyId: property.id, agencyId: agency?.id }}
                href={`https://wa.me/${(agent?.whatsapp ?? agency?.whatsapp ?? '').replace(/[^\d]/g, '')}`}
                className="mt-3 block border border-obsidian px-4 py-3 text-center text-xs uppercase tracking-[0.14em] text-obsidian"
              >
                {t('whatsappCta')}
              </TrackedLink>
            ) : null}
            <p className="mt-4 text-[length:var(--text-xs)] leading-relaxed text-graphite">
              {t('disclaimer')}
            </p>
          </div>
        </aside>
      </div>

      {similar.length > 0 ? (
        <section className="border-t border-line px-4 sm:px-7 py-8">
          <h2 className="mb-5 font-display text-xl text-ink">{t('similarTitle')}</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {similar.map((item) => (
              <PropertyCard key={item.id} property={item} />
            ))}
          </div>
        </section>
      ) : null}

      <nav aria-label={t('breadcrumbHome')} className="px-4 sm:px-7 pb-6 text-xs text-graphite">
        <Link href="/" className="hover:text-patina">
          {t('breadcrumbHome')}
        </Link>
        {' / '}
        <Link href="/collection" className="hover:text-patina">
          {t('breadcrumbSearch')}
        </Link>
        {' / '}
        <span aria-current="page">{property.title}</span>
      </nav>
      </main>

      <SiteFooter />
    </>
  );
}
