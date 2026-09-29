import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RichText } from '@payloadcms/richtext-lexical/react';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Link } from '@/i18n/navigation';
import { getReportBySlug, getReports, type Locale } from '@/lib/db';
import { breadcrumbJsonLd, datasetJsonLd } from '@/lib/seo/jsonld';
import { buildPageMetadata } from '@/lib/seo/metadata';
import type { Market, Report } from '@/payload-types';

/**
 * §11.6 report page: the ungated 400–600-word summary with the key figures is
 * the acquisition asset — public and indexable. The full PDF requires an
 * account: the CTA goes through /api/member/report/[slug]/pdf, which mints a
 * fresh signed URL per member request, so nothing gated bakes into this
 * static page.
 */
export const revalidate = 900;

interface ReportPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const reports = await getReports();
    return reports.map((report) => ({ slug: report.slug }));
  } catch {
    return [];
  }
}

async function loadReport(slug: string, locale: string): Promise<Report | null> {
  try {
    return await getReportBySlug(slug, locale as Locale);
  } catch (err) {
    console.warn('[report] load failed, treating as not found:', err);
    return null;
  }
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const report = await loadReport(slug, locale);
  if (!report) return {};
  const t = await getTranslations('intelligence');
  return buildPageMetadata({
    // §12.4: "{Title} — Lawrence Intelligence".
    title: report.metaTitle ?? t('reportMetaTitle', { title: report.title }),
    description: report.metaDescription,
    path: `/intelligence/${slug}`,
    locale,
    ogType: 'article',
    // Rule 8: sample content is noindexed and out of sitemaps.
    ...(report.isSample ? { robots: { index: false, follow: false } } : {}),
  });
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const report = await loadReport(slug, locale);
  if (!report) notFound();

  const t = await getTranslations('intelligence');
  const tl = await getTranslations('listing');

  const markets = (report.markets ?? [])
    .map((entry) => (typeof entry === 'object' ? entry : null))
    .filter((entry): entry is Market => entry != null);
  const authors = (report.authors ?? []).map((entry) => entry.name).filter(Boolean);

  const dateFmt = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const jsonLd = [
    breadcrumbJsonLd(locale, [
      { name: tl('breadcrumbHome'), path: '' },
      { name: t('title'), path: '/intelligence' },
      { name: report.title, path: `/intelligence/${slug}` },
    ]),
    // §15.5: Dataset on reports — the summary's figures are citable data.
    datasetJsonLd({
      name: report.title,
      description: report.metaDescription ?? t('metaDescription'),
      url: `/${locale}/intelligence/${slug}`,
      dateModified: report.updatedAt,
    }),
  ];

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
      <main className="min-h-screen bg-bone pb-24">
        <article className="mx-auto max-w-3xl px-7 pt-10">
          <p className="mb-2 text-[length:var(--text-xs)] uppercase tracking-label text-graphite">
            {t('title')}
            {report.publicationDate
              ? ` · ${t('publishedOn', { date: dateFmt.format(new Date(report.publicationDate)) })}`
              : null}
          </p>
          <h1 className="mb-3 font-display text-3xl leading-tight tracking-[-0.02em] text-ink">
            {report.title}
          </h1>
          {authors.length > 0 ? (
            <p className="mb-6 text-sm text-graphite">
              {t('byAuthors', { names: authors.join(', ') })}
            </p>
          ) : null}

          {report.summary ? (
            <section aria-label={t('summaryLabel')} className="text-sm leading-relaxed text-graphite">
              <RichText data={report.summary} />
            </section>
          ) : null}

          {/* The gated PDF — a fresh signed URL is minted per member request. */}
          <section className="mt-10 border border-line bg-vellum px-6 py-6">
            <p className="mb-4 max-w-[60ch] text-sm leading-relaxed text-graphite">
              {t('gatedNote')}
            </p>
            <span className="flex flex-wrap gap-4">
              <a
                href={`/api/member/report/${report.slug}/pdf`}
                className="inline-block border border-ink px-5 py-2.5 text-xs uppercase tracking-label text-ink hover:bg-ink hover:text-vellum"
              >
                {t('downloadPdf')}
              </a>
              <Link href="/join" className="self-center text-sm text-patina underline">
                {t('joinCta')}
              </Link>
            </span>
          </section>

          {markets.length > 0 ? (
            <nav aria-label={t('relatedMarketsTitle')} className="mt-10">
              <h2 className="mb-3 font-display text-lg text-ink">{t('relatedMarketsTitle')}</h2>
              <div className="flex flex-wrap gap-2">
                {markets.map((market) => (
                  <Link
                    key={market.id}
                    href={`/markets/${market.slug}`}
                    className="border border-line px-3 py-1.5 text-xs text-patina hover:bg-bone"
                  >
                    {market.name}
                  </Link>
                ))}
              </div>
            </nav>
          ) : null}

          <p className="mt-10">
            <Link href="/intelligence" className="text-sm text-patina underline">
              {t('backToIndex')}
            </Link>
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
