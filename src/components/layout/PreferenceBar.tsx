import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { CurrencySwitcher } from './CurrencySwitcher';
import { LocaleSwitcher } from './LocaleSwitcher';
import { UnitSwitcher } from './UnitSwitcher';

/**
 * Locale · currency · units switchers, grouped as in the design preview's
 * footer ("English · EUR · Metric"). Server component: all labels are
 * translated here and passed down as strings, so the next-intl client runtime
 * (~20 kB gz) never ships to the browser — that's the difference between the
 * home route fitting its 110 kB budget or not.
 */
export async function PreferenceBar({ dark = false }: { dark?: boolean }) {
  const t = await getTranslations('preferences');
  const locale = await getLocale();

  // Dark (footer) variant reads as the preview's "English · EUR · Metric"
  // heading — plain uppercase values joined by dots, still fully operable.
  const dot = dark ? <span aria-hidden="true">·</span> : null;

  return (
    <div className={`flex flex-wrap items-center ${dark ? 'gap-2 text-vellum' : 'gap-4'}`}>
      <Suspense>
        <LocaleSwitcher label={t('language')} currentLocale={locale} dark={dark} />
      </Suspense>
      {dot}
      <CurrencySwitcher label={t('currency')} dark={dark} />
      {dot}
      <UnitSwitcher
        label={t('units')}
        metricLabel={t('unitsMetric')}
        imperialLabel={t('unitsImperial')}
        dark={dark}
      />
    </div>
  );
}
