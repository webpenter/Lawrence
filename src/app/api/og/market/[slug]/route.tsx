import { ImageResponse } from 'next/og';

import { brand } from '@/config/brand';
import { getMarketBySlug, searchPropertiesPostgres } from '@/lib/db';
import { formatPriceCompact } from '@/lib/intl/format';
import { marketPassesGate } from '@/lib/seo/segments';
import { tokens } from '@/tokens/tokens';
import { HORIZON_GRADIENTS } from '@/tokens/placeholders';

export const revalidate = 3600;

// §15 dynamic OG image for market pages: the market name plus one sourced
// figure — the same answer-first shape the page itself opens with.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<ImageResponse> {
  const { slug } = await params;

  let title = brand.tagline;
  let statLine: string | null = null;
  try {
    const market = await getMarketBySlug(slug);
    if (market && marketPassesGate(market)) {
      title = market.name;
      const prime = market.stats?.primeEntryEur;
      if (prime?.value != null && prime.source && prime.asOfDate) {
        statLine = `Prime entry ${formatPriceCompact(prime.value, 'EUR', 'en')}`;
      } else {
        const { total } = await searchPropertiesPostgres({ marketId: market.id, limit: 1 });
        if (total > 0) statLine = `${total} properties in the collection`;
      }
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
          {statLine ? (
            <div style={{ fontSize: 32, marginTop: 22, color: tokens.color.patinaSoft }}>
              {statLine}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
