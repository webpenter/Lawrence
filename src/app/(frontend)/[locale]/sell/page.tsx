import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AgencyApplicationForm } from '@/components/agency/AgencyApplicationForm';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { buildPageMetadata } from '@/lib/seo/metadata';

export const revalidate = 3600;

interface SellPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: SellPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('sell');
  return buildPageMetadata({
    title: t('title'),
    description: t('sub'),
    path: '/sell',
    locale,
  });
}

/**
 * §9.4 onboarding step 1 — the agency application. Reviewed by an admin;
 * approval creates the agency account and sends the set-password email.
 */
export default async function SellPage({ params }: SellPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('sell');

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-7 py-10">
        <h1 className="mb-2 font-display text-2xl text-ink">{t('title')}</h1>
        <p className="mb-6 max-w-[62ch] text-sm text-graphite">{t('sub')}</p>
        <AgencyApplicationForm
          labels={{
            agencyName: t('fieldAgencyName'),
            contactName: t('fieldContactName'),
            email: t('fieldEmail'),
            phone: t('fieldPhone'),
            country: t('fieldCountry'),
            website: t('fieldWebsite'),
            inventoryNote: t('fieldInventoryNote'),
            consent: t('consent'),
            submit: t('submit'),
            sending: t('sending'),
            success: t('success'),
            error: t('error'),
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
