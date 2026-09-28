import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RichText } from '@payloadcms/richtext-lexical/react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { getArticleBySlug, getPublishedArticles } from '@/lib/db/articles';
import type { Locale } from '@/lib/db';
import { isFallbackContent } from '@/lib/sample/fallback-content';
import { hreflangAlternates } from '@/lib/seo/hreflang';
import { formatDate } from '@/lib/intl/format';

export const revalidate = 3600;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const articles = await getPublishedArticles('en');
  return articles.map((article) => ({ slug: article.slug }));
}

interface ArticlePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getArticleBySlug(slug, locale as Locale);
  if (!article) return {};
  return {
    title: article.metaTitle ?? article.title,
    description: article.metaDescription ?? article.excerpt ?? undefined,
    alternates: hreflangAlternates(`/journal/${slug}`),
    // Demo fallback content never enters the index (§13.12).
    ...(isFallbackContent(article) ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const article = await getArticleBySlug(slug, locale as Locale);
  if (!article) notFound();

  const t = await getTranslations('journal');

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-7 py-10">
        <nav aria-label={t('breadcrumbLabel')} className="mb-6 text-xs text-graphite">
          <Link href={`/${locale}/journal`} className="hover:text-patina">
            {t('backToJournal')}
          </Link>
        </nav>

        {isFallbackContent(article) ? (
          <p className="mb-4 inline-block bg-patina-soft px-2 py-0.5 text-[length:var(--text-xs)] font-medium uppercase tracking-[0.14em] text-ink">
            {t('sampleNotice')}
          </p>
        ) : null}

        <article>
          <h1 className="font-display text-3xl leading-tight text-ink">{article.title}</h1>
          {article.publishedAt ? (
            <p className="mt-2 text-xs text-graphite">
              {t('publishedOn', { date: formatDate(article.publishedAt, locale) })}
            </p>
          ) : null}
          {article.body ? (
            <div className="prose-waterline mt-8 flex flex-col gap-4 text-base leading-relaxed text-ink [&_p]:m-0">
              <RichText data={article.body} />
            </div>
          ) : null}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
