import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RichText } from '@payloadcms/richtext-lexical/react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { getPayloadClient, type Locale } from '@/lib/db';
import { findLegalDocument, LEGAL_DOCUMENTS } from '@/content/legal/documents';
import { hreflangAlternates } from '@/lib/seo/hreflang';
import type { Page } from '@/payload-types';

export const revalidate = 3600;

// §16.4: privacy, cookie and terms pages, live before launch. A published
// CMS Page with slug `legal-<doc>` supersedes the built-in document; the
// shipped defaults describe the platform's actual behaviour and are flagged
// for counsel review (§13.9: legal copy is never fabricated beyond that).
interface LegalPageProps {
  params: Promise<{ locale: string; doc: string }>;
}

export function generateStaticParams(): Array<{ doc: string }> {
  return LEGAL_DOCUMENTS.map((doc) => ({ doc: doc.slug }));
}

async function loadCmsPage(doc: string, locale: string): Promise<Page | null> {
  try {
    const payload = await getPayloadClient();
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: `legal-${doc}` } }, { _status: { equals: 'published' } }] },
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

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { doc, locale } = await params;
  const builtIn = findLegalDocument(doc);
  if (!builtIn) return {};
  const cms = await loadCmsPage(doc, locale);
  return {
    title: cms?.metaTitle ?? cms?.title ?? builtIn.title,
    description: cms?.metaDescription ?? builtIn.description,
    alternates: hreflangAlternates(`/legal/${doc}`, locale),
  };
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { locale, doc } = await params;
  setRequestLocale(locale);
  const builtIn = findLegalDocument(doc);
  if (!builtIn) notFound();

  const t = await getTranslations('legal');
  const cms = await loadCmsPage(doc, locale);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-7 py-10">
        <h1 className="mb-2 font-display text-3xl leading-tight text-ink">
          {cms?.title ?? builtIn.title}
        </h1>

        {cms?.body ? (
          <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-ink">
            <RichText data={cms.body} />
          </div>
        ) : (
          <>
            <p className="mb-8 border border-line bg-vellum p-3 text-xs text-graphite">
              {t('reviewNote')}
            </p>
            {builtIn.sections.map((section) => (
              <section key={section.heading} className="mb-8">
                <h2 className="mb-3 font-display text-lg text-ink">{section.heading}</h2>
                <div className="flex flex-col gap-3 text-sm leading-relaxed text-graphite">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
