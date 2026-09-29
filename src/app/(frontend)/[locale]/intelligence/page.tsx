import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Link } from '@/i18n/navigation';
import { getReports, type Locale } from '@/lib/db';
import { buildPageMetadata } from '@/lib/seo/metadata';
import type { Report } from '@/payload-types';

// §11.6 the intelligence library: index of reports with ungated summaries.
export const revalidate = 900;

interface IntelligencePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: IntelligencePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('intelligence');
  return buildPageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/intelligence',
    locale,
  });
}

export default async function IntelligencePage({ params }: IntelligencePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('intelligence');

  let reports: Report[] = [];
  try {
    reports = await getReports(locale as Locale, 20);
  } catch {
    // empty state below
  }

  const dateFmt = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-bone pb-24">
        <header className="border-b border-line px-7 pb-6 pt-10">
          <h1 className="font-display text-3xl tracking-[-0.02em] text-ink">{t('title')}</h1>
          <p className="mt-2 max-w-[60ch] text-sm text-graphite">{t('sub')}</p>
        </header>

        {reports.length === 0 ? (
          <p className="px-7 py-10 text-sm text-graphite">{t('empty')}</p>
        ) : (
          <ul className="flex flex-col">
            {reports.map((report) => (
              <li key={report.id} className="border-b border-line px-7 py-6">
                <p className="mb-1 text-[length:var(--text-xs)] uppercase tracking-label text-graphite">
                  {report.publicationDate
                    ? t('publishedOn', { date: dateFmt.format(new Date(report.publicationDate)) })
                    : null}
                </p>
                <Link
                  href={`/intelligence/${report.slug}`}
                  className="font-display text-xl text-ink hover:text-patina"
                >
                  {report.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
