import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Link } from '@/i18n/navigation';

// The designed 410 page (§14.5): the middleware rewrites expired listing URLs
// here with HTTP status 410 — a 404 invites re-crawling, 410 removes faster.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function GonePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('listing');
  const ts = await getTranslations('search');

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-start justify-center gap-4 px-7">
        <h1 className="font-display text-2xl text-ink">{t('expiredNotice')}</h1>
        <p className="text-sm text-graphite">{t('similarTitle')}:</p>
        <Link
          href="/collection"
          className="bg-obsidian px-5 py-3 text-xs uppercase tracking-[0.14em] text-vellum"
        >
          {ts('pageTitle')}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
