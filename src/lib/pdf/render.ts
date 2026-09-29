import { renderToBuffer } from '@react-pdf/renderer';
import * as React from 'react';

import { brand } from '@/config/brand';
import { formatPriceEur } from '@/lib/intl/format';
import { listingPrice } from '@/lib/intl/listing-price';
import type { Media, Property } from '@/payload-types';

import { BrochureDocument } from './brochure';
import { brochureLabels } from './labels';

function absoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? brand.siteUrl).replace(/\/$/, '');
  return `${base}${url}`;
}

/** MapTiler static map (§13.5 stack) when a key exists; omitted otherwise. */
export function staticMapUrl(property: Property): string | null {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const coords = property.location?.coordinates;
  if (!key || key.startsWith('dev_') || !Array.isArray(coords)) return null;
  const [lng, lat] = coords;
  return `https://api.maptiler.com/maps/dataviz/static/${lng},${lat},11/520x280.png?key=${key}`;
}

/** Plain paragraphs out of the §3.2 provenance rich text, capped for one page. */
export function provenanceText(property: Property, maxChars = 700): string | null {
  const value = property.provenance;
  if (!value) return null;
  const matches = JSON.stringify(value).match(/"text":"([^"]*)"/g) ?? [];
  const text = matches
    .map((entry) => entry.slice(8, -1))
    .join(' ')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars + 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).trim()}\u2026`;
}

export async function renderBrochure(property: Property, locale = 'en'): Promise<Buffer> {
  const labels = brochureLabels(locale);
  // §12.2: exact, or the guide band, or "Price on request"; sold never shows
  // a price. Works on projected docs — disclosure was enforced upstream.
  const priced = listingPrice(property);
  const priceLabel =
    priced.kind === 'exact'
      ? formatPriceEur(priced.priceEur, 'EUR', locale)
      : priced.kind === 'band'
        ? labels.priceGuideBand
            .replace('{min}', String(priced.minM))
            .replace('{max}', String(priced.maxM))
        : property.status === 'sold'
          ? ''
          : labels.priceOnRequest;

  const imageUrls = (property.media ?? [])
    .filter((item): item is Media => typeof item === 'object' && item !== null)
    .map((media) => absoluteUrl(media.sizes?.w960?.url ?? media.url))
    .filter((url): url is string => Boolean(url))
    .slice(0, 7);

  const element = React.createElement(BrochureDocument, {
    property,
    labels,
    priceLabel,
    provenance: provenanceText(property),
    imageUrls,
    mapUrl: staticMapUrl(property),
  }) as unknown as Parameters<typeof renderToBuffer>[0];
  return renderToBuffer(element);
}
