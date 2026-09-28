import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { EnquiryForm } from '@/components/property/EnquiryForm';
import { hreflangAlternates } from '@/lib/seo/hreflang';
import { HERO_SCRIM, horizonGradientFor } from '@/tokens/placeholders';

export const revalidate = 3600;

interface ListWithUsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ListWithUsPageProps): Promise<Metadata> {
  await params;
  const t = await getTranslations('listWithUs');
  const home = await getTranslations('home');
  return {
    title: t('title'),
    description: home('supplyCtaSub'),
    alternates: hreflangAlternates('/list-with-us'),
  };
}

// The supply-side landing (§5.2, copy §11.1). The full §8.2 application form
// with inventory fields joins the agency-onboarding flow; the desk lead here
// starts that conversation.
export default async function ListWithUsPage({ params }: ListWithUsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('listWithUs');
  const home = await getTranslations('home');
  const tl = await getTranslations('listing');

  return (
    <>
      <SiteHeader />
      <main>
        <div className="relative flex min-h-64 items-end text-vellum">
          <span
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: horizonGradientFor('list-with-us') }}
          />
          <span aria-hidden="true" className="absolute inset-0" style={{ background: HERO_SCRIM }} />
          <div className="relative z-10 px-7 pb-7">
            <h1 className="mb-2 font-display text-3xl tracking-[-0.02em]">{t('title')}</h1>
            <p className="max-w-[52ch] text-sm text-vellum/85">{home('supplyCtaSub')}</p>
          </div>
        </div>

        <section className="grid gap-8 px-7 py-8 md:grid-cols-3">
          {(['whyVerified', 'whyFrontage', 'whyBerth'] as const).map((key) => (
            <p key={key} className="border-t border-ink pt-3 text-sm text-graphite">
              {home(key)}
            </p>
          ))}
        </section>

        <section className="mx-auto max-w-xl px-7 pb-10">
          <h2 className="mb-1 font-display text-lg text-ink">{t('formTitle')}</h2>
          <p className="mb-5 text-xs text-graphite">{t('formSub')}</p>
          <EnquiryForm
            source="list_with_us"
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
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
