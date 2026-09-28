import { NextResponse } from 'next/server';

import { getAggregatesForScope, getLandingPageBySlug } from '@/lib/db';
import { comboToFilters, passesEditorialGate } from '@/lib/seo/combos';

export const revalidate = 900;

// §14.6.5: public aggregate JSON per landing combination — counts and medians
// with an updatedAt. Cheap to build, disproportionately citable.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ combo: string }> },
): Promise<NextResponse> {
  const { combo } = await params;
  try {
    const page = await getLandingPageBySlug(combo);
    if (!page || !passesEditorialGate(page)) {
      return NextResponse.json({ error: 'unknown combination' }, { status: 404 });
    }
    const filters = comboToFilters(page);
    const aggregates = await getAggregatesForScope({
      country: filters.country,
      waterBodyType: filters.waterBodyTypes?.[0],
      propertyType: filters.propertyTypes?.[0],
      marketId: filters.marketId,
    });
    return NextResponse.json(
      {
        combo,
        title: page.title,
        count: aggregates.count,
        medianPriceEur: aggregates.medianPriceEur,
        medianFrontageM: aggregates.medianFrontageM,
        topPropertyType: aggregates.topPropertyType,
        updatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } },
    );
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
