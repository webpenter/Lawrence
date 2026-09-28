import { ANONYMOUS } from '@/lib/access/viewer';
import { ImageResponse } from 'next/og';

import { brand } from '@/config/brand';
import { getPropertyBySlug } from '@/lib/db';
import { formatPriceEur } from '@/lib/intl/format';
import { tokens } from '@/tokens/tokens';
import { HORIZON_GRADIENTS } from '@/tokens/placeholders';

export const revalidate = 3600;

// §14 dynamic OG image for listings: wordmark, title, locality, price and the
// water credential — the share card carries the differentiator, not a generic
// photo crop. Falls back to a brand card when the listing is unavailable.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<ImageResponse> {
  const { slug } = await params;

  let title = brand.tagline;
  let subtitle = brand.domain;
  let credential = '';
  try {
    const property = await getPropertyBySlug(ANONYMOUS, slug);
    if (property) {
      title = property.title;
      subtitle = [property.location?.locality, property.location?.region]
        .filter(Boolean)
        .join(' · ');
      const price =
        property.priceDisclosure === 'exact' && property.priceEur != null
          ? formatPriceEur(property.priceEur, 'EUR', 'en')
          : 'Price on request';
      const beds = property.bedrooms != null ? `${property.bedrooms} bedrooms` : null;
      const built = property.builtAreaSqm != null ? `${property.builtAreaSqm} m²` : null;
      credential = [price, beds ?? built].filter(Boolean).join('  ·  ');
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
          backgroundImage: HORIZON_GRADIENTS[0],
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
          <div style={{ fontSize: 58, lineHeight: 1.1, marginTop: 18, maxWidth: 1000 }}>
            {title}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 22,
              fontSize: 30,
              color: tokens.color.patinaSoft,
            }}
          >
            <span>{subtitle}</span>
            <span>{credential}</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
