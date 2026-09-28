import { getLocale, getTranslations } from 'next-intl/server';

import { humanizeEnum } from '@/components/property/WaterChips';
import type { ScopeAggregates } from '@/lib/db';
import { formatLength, formatPriceEur } from '@/lib/intl/format';
import { getViewerPreferences } from '@/lib/intl/preferences';

/**
 * Live aggregates strip per the design preview (.stats): count · median price
 * · median frontage · most common type. Computed at render, never stored
 * (§10.4). Cells with no data are simply omitted.
 */
export async function StatsStrip({ aggregates }: { aggregates: ScopeAggregates }) {
  const t = await getTranslations('landing');
  const locale = await getLocale();
  const { currency, units } = await getViewerPreferences();

  const cells: Array<{ value: string; label: string }> = [
    {
      value: new Intl.NumberFormat(locale).format(aggregates.count),
      label: t('statsAvailable'),
    },
  ];
  if (aggregates.medianPriceEur != null) {
    cells.push({
      value: formatPriceEur(aggregates.medianPriceEur, currency, locale),
      label: t('statsMedianPrice'),
    });
  }
  if (aggregates.medianFrontageM != null) {
    cells.push({
      value: formatLength(aggregates.medianFrontageM, units, locale),
      label: t('statsMedianFrontage'),
    });
  }
  if (aggregates.topPropertyType) {
    cells.push({ value: humanizeEnum(aggregates.topPropertyType), label: t('statsTopType') });
  }

  return (
    <dl className="mx-7 grid grid-cols-2 border border-line md:grid-cols-4">
      {cells.map((cell, index) => (
        <div
          key={cell.label}
          className={`p-4 ${index < cells.length - 1 ? 'md:border-r md:border-line' : ''}`}
        >
          <dd className="font-display text-xl tabular-nums text-ink">{cell.value}</dd>
          <dt className="text-[length:var(--text-xs)] uppercase tracking-[0.18em] text-graphite">
            {cell.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}
