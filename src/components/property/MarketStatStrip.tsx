import { getFormatter } from 'next-intl/server';

import type { Market } from '@/payload-types';

interface StatEntry {
  key: string;
  value: number;
  source: string;
  asOfDate: string;
  format: 'eur' | 'eurPerSqm' | 'pct' | 'days';
}

const STAT_ORDER: Array<{ key: keyof NonNullable<Market['stats']>; format: StatEntry['format'] }> = [
  { key: 'primeEntryEur', format: 'eur' },
  { key: 'medianPriceEurPerSqm', format: 'eurPerSqm' },
  { key: 'yoyChangePct', format: 'pct' },
  { key: 'avgDaysOnMarket', format: 'days' },
];

function collectStats(market: Market): StatEntry[] {
  const stats = market.stats;
  if (!stats) return [];
  const entries: StatEntry[] = [];
  for (const { key, format } of STAT_ORDER) {
    const entry = stats[key] as { value?: number | null; source?: string | null; asOfDate?: string | null } | undefined;
    // §15.4: a number publishes only with its source and date.
    if (entry?.value != null && entry.source && entry.asOfDate) {
      entries.push({ key, value: entry.value, source: entry.source, asOfDate: entry.asOfDate, format });
    }
  }
  return entries.slice(0, 3);
}

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export interface MarketStatStripProps {
  market: Market;
  /** Localised stat labels keyed by stat name. */
  labels: Record<string, string>;
  heading: string;
}

/**
 * §11.3 market context strip: three live statistics from the Market record,
 * each with its source and as-of date — the research discipline rendered
 * inline. Renders nothing when fewer than one sourced stat exists.
 */
export async function MarketStatStrip({ market, labels, heading }: MarketStatStripProps) {
  const stats = collectStats(market);
  if (stats.length === 0) return null;
  const format = await getFormatter();

  const display = (stat: StatEntry): string => {
    switch (stat.format) {
      case 'eur':
        return `€${format.number(Math.round(stat.value / 1_000_000 * 10) / 10)}M`;
      case 'eurPerSqm':
        return `€${format.number(Math.round(stat.value))}/m²`;
      case 'pct':
        return `${stat.value > 0 ? '+' : ''}${format.number(stat.value)}%`;
      case 'days':
        return format.number(Math.round(stat.value));
    }
  };

  return (
    <section className="mt-8 border-y border-line py-5">
      <h2 className="mb-4 text-[length:var(--text-xs)] uppercase tracking-label text-graphite">
        {heading}
      </h2>
      <dl className="grid gap-6 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.key}>
            <dt className="text-[length:var(--text-xs)] uppercase tracking-[0.12em] text-graphite">
              {labels[stat.key] ?? stat.key}
            </dt>
            <dd className="mt-1 font-display text-2xl tabular-nums text-ink">{display(stat)}</dd>
            <dd className="mt-1 text-[length:var(--text-xs)] text-graphite">
              {sourceHost(stat.source)} ·{' '}
              {format.dateTime(new Date(stat.asOfDate), { year: 'numeric', month: 'short' })}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
