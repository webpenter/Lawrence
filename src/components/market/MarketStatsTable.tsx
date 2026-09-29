import { getTranslations } from 'next-intl/server';

import { formatPriceCompact, formatPriceEur } from '@/lib/intl/format';
import type { Market } from '@/payload-types';

interface StatRow {
  key: string;
  label: string;
  value: string;
  source: string;
  asOfDate: string;
}

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * §11.5 market statistics table — every figure with its source and asOfDate
 * (§15.4 discipline: an unsourced number never renders). Server component.
 */
export async function MarketStatsTable({
  market,
  locale,
}: {
  market: Market;
  locale: string;
}) {
  const t = await getTranslations('destinations');
  const stats = market.stats;
  if (!stats) return null;

  const dateFmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' });
  const rows: StatRow[] = [];

  const push = (
    key: 'medianPriceEurPerSqm' | 'primeEntryEur' | 'yoyChangePct' | 'avgDaysOnMarket',
    label: string,
    format: (value: number) => string,
  ) => {
    const entry = stats[key];
    if (entry?.value != null && entry.source && entry.asOfDate) {
      rows.push({
        key,
        label,
        value: format(entry.value),
        source: entry.source,
        asOfDate: dateFmt.format(new Date(entry.asOfDate)),
      });
    }
  };

  push('medianPriceEurPerSqm', t('statMedianPriceEurPerSqm'), (v) =>
    formatPriceEur(v, 'EUR', locale),
  );
  push('primeEntryEur', t('statPrimeEntryEur'), (v) => formatPriceCompact(v, 'EUR', locale));
  push('yoyChangePct', t('statYoyChangePct'), (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`);
  push('avgDaysOnMarket', t('statAvgDaysOnMarket'), (v) => `${Math.round(v)}`);

  const band = stats.transactionVolumeBand;
  if (band?.value && band.source && band.asOfDate) {
    const bandLabels: Record<string, string> = {
      under_10: t('bandUnder10'),
      '10_50': t('band1050'),
      '50_200': t('band50200'),
      over_200: t('bandOver200'),
    };
    rows.push({
      key: 'transactionVolumeBand',
      label: t('statTransactionVolumeBand'),
      value: bandLabels[band.value] ?? band.value,
      source: band.source,
      asOfDate: dateFmt.format(new Date(band.asOfDate)),
    });
  }

  if (rows.length === 0) return null;

  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{t('statsTitle')}</caption>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-line">
            <th scope="row" className="py-2.5 pr-3 text-left font-normal text-graphite">
              {row.label}
            </th>
            <td className="py-2.5 pr-3 text-right font-display text-base text-ink">{row.value}</td>
            <td className="py-2.5 text-right text-[length:var(--text-xs)] text-graphite">
              <a href={row.source} rel="nofollow noopener" className="underline hover:text-patina">
                {sourceHost(row.source)}
              </a>{' '}
              · {t('statAsOf', { date: row.asOfDate })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
