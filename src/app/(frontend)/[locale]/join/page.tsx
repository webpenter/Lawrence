import { getTranslations } from 'next-intl/server';

import { JoinForm } from '@/components/auth/JoinForm';
import { brand } from '@/config/brand';
import { countOffMarketListings } from '@/lib/db';
import { horizonGradientFor } from '@/tokens/placeholders';

// Auth surfaces render per-request (§5.3 spirit): no SSG, no cache.
export const dynamic = 'force-dynamic';

const [WORDMARK_TOP, ...rest] = brand.name.split(' ');
const WORDMARK_SUB = rest.join(' ');

export default async function JoinPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'join' });
  const offMarketCount = await countOffMarketListings();

  return (
    <main className="grid min-h-svh grid-cols-1 md:grid-cols-2">
      <div className="relative flex min-h-64 flex-col justify-end">
        <div
          className="absolute inset-0"
          style={{ background: horizonGradientFor('join-panel') }}
        />
        <div className="relative z-10 p-8 text-white md:p-12">
          <div className="mb-3.5 font-display text-lg uppercase leading-[1.1] tracking-[0.3em]">
            {WORDMARK_TOP}
            <small className="mt-1 block font-body text-[length:var(--text-xs)] uppercase tracking-[0.42em] opacity-75">
              {WORDMARK_SUB}
            </small>
          </div>
          <p className="m-0 max-w-[34ch] text-sm text-white/80">
            {t('panelLine', { count: offMarketCount })}
          </p>
        </div>
      </div>
      <div className="flex flex-col justify-center bg-bone px-6 py-9 md:px-11 md:py-12">
        <JoinForm
          locale={params.locale}
          labels={{
            title: t('title'),
            sub: t('sub'),
            fieldEmail: t('fieldEmail'),
            fieldPassword: t('fieldPassword'),
            optionalBlock: t('optionalBlock'),
            consentOptIn: t('consentOptIn'),
            magicLinkAlternative: t('magicLinkAlternative'),
            submit: t('title'),
            sending: '…',
            error: t('genericError'),
          }}
        />
      </div>
    </main>
  );
}
