import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { getPublishedArticles } from '@/lib/db/articles';
import type { Locale } from '@/lib/db';
import { isFallbackContent } from '@/lib/sample/fallback-content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { formatDate } from '@/lib/intl/format';

export const revalidate = 3600;

interface JournalPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: JournalPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('journal');
  return buildPageMetadata({
    title: t('title'),
    description: t('sub'),
    path: '/journal',
    locale,
  });
}

export default async function JournalPage({ params }: JournalPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('journal');
  const articles = await getPublishedArticles(locale as Locale);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-7 py-10">
        <h1 className="mb-2 font-display text-2xl text-ink">{t('title')}</h1>
        <p className="mb-8 text-sm text-graphite">{t('sub')}</p>

        {articles.length === 0 ? (
          <p className="border border-line bg-vellum p-6 text-sm text-graphite">{t('empty')}</p>
        ) : (
          <ul className="flex flex-col gap-6">
            {articles.map((article) => (
              <li key={article.slug} className="border border-line bg-vellum p-6">
                {isFallbackContent(article) || article.isSample ? (
                  <p className="mb-2 inline-block bg-patina-soft px-2 py-0.5 text-[length:var(--text-xs)] font-medium uppercase tracking-[0.14em] text-ink">
                    {t('sampleNotice')}
                  </p>
                ) : null}
                <h2 className="font-display text-lg text-ink">
                  <Link
                    href={`/${locale}/journal/${article.slug}`}
                    className="hover:text-patina"
                  >
                    {article.title}
                  </Link>
                </h2>
                {article.publishedAt ? (
                  <p className="mt-1 text-xs text-graphite">
                    {t('publishedOn', { date: formatDate(article.publishedAt, locale) })}
                  </p>
                ) : null}
                {article.excerpt ? (
                  <p className="mt-3 text-sm text-graphite">{article.excerpt}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
