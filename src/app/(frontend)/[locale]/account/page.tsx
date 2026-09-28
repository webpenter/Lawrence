import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { getCurrentViewer } from '@/lib/auth';
import { isActiveMember } from '@/lib/access/viewer';

export const dynamic = 'force-dynamic';

export default async function AccountPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const viewer = await getCurrentViewer();
  if (!isActiveMember(viewer)) {
    redirect(`/${locale}/join`);
  }

  const t = await getTranslations('account');

  return (
    <>
      <SiteHeader />
      <main className="bg-bone min-h-screen pt-24 pb-32">
        <div className="max-w-4xl mx-auto px-5">
          <h1 className="font-display text-4xl mb-8">{t('title')}</h1>
          
          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">{t('savedTitle')}</h2>
            <div className="bg-vellum p-6 border border-line">
              <p className="text-graphite">{t('savedEmpty')}</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">{t('requirementsTitle')}</h2>
            <div className="bg-vellum p-6 border border-line">
              {/* RequirementsForm lands with Prompt 9's account build. */}
              <p className="text-graphite">{t('requirementsSoon')}</p>
            </div>
          </section>
          
          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">{t('preferencesTitle')}</h2>
            <div className="bg-vellum p-6 border border-line">
               <p className="text-graphite">{t('preferencesSoon')}</p>
            </div>
          </section>

          <section className="border-t border-line pt-8">
            <h2 className="text-xl font-medium text-danger mb-4">{t('deleteTitle')}</h2>
            <p className="text-graphite mb-4">{t('deleteBody')}</p>
            <button className="text-xs uppercase tracking-[0.14em] text-danger border border-danger px-4 py-2 hover:bg-danger/10">
              {t('deleteTitle')}
            </button>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
