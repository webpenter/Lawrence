import { NextResponse } from 'next/server';

import { getMarketBySlug } from '@/lib/db';
import { marketPassesGate } from '@/lib/seo/segments';

export const revalidate = 900;

const STAT_UNITS: Record<string, string> = {
  medianPriceEurPerSqm: 'EUR/m2',
  primeEntryEur: 'EUR',
  yoyChangePct: 'percent',
  avgDaysOnMarket: 'days',
};

/**
 * §15.6 — the published market figures as machine-readable JSON, each with
 * its source URL and asOfDate, referenced by the market page's Dataset
 * JSON-LD. Serves only §5.5-gated markets; the figures are the editor-
 * maintained Market.stats, never on-the-fly aggregates.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ market: string }> },
): Promise<NextResponse> {
  const { market: slug } = await params;

  try {
    const market = await getMarketBySlug(slug);
    if (!market || !marketPassesGate(market)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const stats: Array<{
      key: string;
      value: number | string;
      unit?: string;
      source: string;
      asOfDate: string;
    }> = [];

    for (const [key, unit] of Object.entries(STAT_UNITS)) {
      const entry = market.stats?.[key as keyof typeof market.stats] as
        | { value?: number | null; source?: string | null; asOfDate?: string | null }
        | undefined;
      if (entry?.value != null && entry.source && entry.asOfDate) {
        stats.push({ key, value: entry.value, unit, source: entry.source, asOfDate: entry.asOfDate });
      }
    }
    const band = market.stats?.transactionVolumeBand;
    if (band?.value && band.source && band.asOfDate) {
      stats.push({
        key: 'transactionVolumeBand',
        value: band.value,
        unit: 'transactions/year (band)',
        source: band.source,
        asOfDate: band.asOfDate,
      });
    }

    return NextResponse.json(
      {
        market: market.slug,
        name: market.name,
        country: market.country ?? null,
        stats,
        license: 'Figures are derived from the cited open sources; cite with source and asOfDate.',
        updatedAt: market.updatedAt,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
