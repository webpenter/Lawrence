import type { Metadata } from 'next';
import { RichText } from '@payloadcms/richtext-lexical/react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Link } from '@/i18n/navigation';
import { getPayloadClient, type Locale } from '@/lib/db';
import { hreflangAlternates } from '@/lib/seo/hreflang';
import type { Page } from '@/payload-types';

export const revalidate = 3600;

// §6.8 static pages: a published CMS Page with slug `about` supersedes the
// built-in copy below (same pattern as the legal documents).
interface AboutPageProps {
  params: Promise<{ locale: string }>;
}

async function loadCmsPage(locale: string): Promise<Page | null> {
  try {
    const payload = await getPayloadClient();
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: 'about' } }, { _status: { equals: 'published' } }] },
      limit: 1,
      depth: 0,
      locale: locale as Locale,
      overrideAccess: false,
    });
    return docs[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('about');
  const cms = await loadCmsPage(locale);
  return {
    title: cms?.metaTitle ?? cms?.title ?? t('title'),
    description: cms?.metaDescription ?? t('sub'),
    alternates: hreflangAlternates('/about'),
  };
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');
  const nav = await getTranslations('nav');
  const cms = await loadCmsPage(locale);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-7 py-10">
        <h1 className="mb-3 font-display text-3xl leading-tight text-ink">
          {cms?.title ?? t('title')}
        </h1>

        {cms?.body ? (
          <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-ink">
            <RichText data={cms.body} />
          </div>
        ) : (
          <>
            <p className="mb-8 max-w-[52ch] text-sm leading-relaxed text-graphite">{t('sub')}</p>

            <section className="mb-8">
              <h2 className="mb-3 font-display text-lg text-ink">{t('ruleTitle')}</h2>
              <p className="text-sm leading-relaxed text-graphite">{t('ruleBody')}</p>
            </section>

            <section className="mb-8">
              <h2 className="mb-3 font-display text-lg text-ink">{t('dataTitle')}</h2>
              <p className="text-sm leading-relaxed text-graphite">{t('dataBody')}</p>
            </section>

            <section className="mb-10">
              <h2 className="mb-3 font-display text-lg text-ink">{t('agenciesTitle')}</h2>
              <p className="mb-5 text-sm leading-relaxed text-graphite">{t('agenciesBody')}</p>
              <Link
                href="/list-with-us"
                className="inline-block bg-obsidian px-6 py-3 text-xs uppercase tracking-[0.14em] text-vellum"
              >
                {nav('listWithUs')}
              </Link>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
