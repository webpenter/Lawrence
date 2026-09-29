import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { EnquiryForm } from '@/components/property/EnquiryForm';
import { brand } from '@/config/brand';
import { hreflangAlternates } from '@/lib/seo/hreflang';

export const revalidate = 3600;

interface ContactPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('contact');
  return {
    title: t('title'),
    description: t('sub'),
    alternates: hreflangAlternates('/contact', locale),
  };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('contact');
  const tl = await getTranslations('listing');

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-7 py-10">
        <h1 className="mb-2 font-display text-2xl text-ink">{t('title')}</h1>
        <p className="mb-6 text-sm text-graphite">{t('sub')}</p>
        <EnquiryForm
          source="contact"
          locale={locale}
          labels={{
            name: tl('formName'),
            email: tl('formEmail'),
            phone: tl('formPhone'),
            message: tl('formMessage'),
            consent: tl('enquiryConsent'),
            submit: tl('formSubmit'),
            sending: tl('formSending'),
            success: tl('formSuccess'),
            error: tl('formError'),
            consentRequired: tl('formConsentRequired'),
            errorSummary: tl('formErrorSummary'),
            errorName: tl('formErrorName'),
            errorEmail: tl('formErrorEmail'),
          }}
        />
        <p className="mt-8 text-xs text-graphite">
          {brand.email.contact} · {brand.phone}
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
