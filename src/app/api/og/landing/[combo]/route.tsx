import { ImageResponse } from 'next/og';

import { brand } from '@/config/brand';
import { getAggregatesForScope, getLandingPageBySlug } from '@/lib/db';
import { comboToFilters } from '@/lib/seo/combos';
import { tokens } from '@/tokens/tokens';
import { HORIZON_GRADIENTS } from '@/tokens/placeholders';

export const revalidate = 3600;

// §14 dynamic OG image for landing pages: the combination title plus the live
// count — the same answer-first shape the page itself opens with.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ combo: string }> },
): Promise<ImageResponse> {
  const { combo } = await params;

  let title = brand.tagline;
  let count: number | null = null;
  try {
    const page = await getLandingPageBySlug(combo);
    if (page) {
      title = page.title;
      const filters = comboToFilters(page);
      const aggregates = await getAggregatesForScope({
        country: filters.country,
        waterBodyType: filters.waterBodyTypes?.[0],
        propertyType: filters.propertyTypes?.[0],
        marketId: filters.marketId,
      });
      count = aggregates.count;
    }
  } catch {
    // brand fallback card
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          backgroundImage: HORIZON_GRADIENTS[2],
          fontFamily: 'Georgia, serif',
          color: tokens.color.vellum,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 56,
            background: 'linear-gradient(180deg, rgba(8,20,28,0) 0%, rgba(8,20,28,0.85) 60%)',
          }}
        >
          <div style={{ fontSize: 28, letterSpacing: 10, textTransform: 'uppercase' }}>
            {brand.name}
          </div>
          <div style={{ fontSize: 60, lineHeight: 1.1, marginTop: 18, maxWidth: 1050 }}>
            {title}
          </div>
          {count != null ? (
            <div style={{ fontSize: 32, marginTop: 22, color: tokens.color.patinaSoft }}>
              {count} verified waterfront listings
            </div>
          ) : null}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
