import type { Market, SegmentPage } from '@/payload-types';

import type { PropertyFilters } from '@/lib/db/filters';

/**
 * The §5.5 market-page grammar:
 * /[locale]/markets/[market] and /[locale]/markets/[market]/[segment], where
 * segment belongs to the controlled taxonomy below. Exactly one canonical URL
 * per combination — the resolver normalises aliases with 301s, and a page
 * renders only when it has published editorial copy plus at least three
 * sourced data points (§5.5). Empty combinations are never auto-published.
 */

export const SEGMENTS = [
  'waterfront-estates',
  'vineyard-estates',
  'ski-chalets',
  'penthouses',
  'private-islands',
  'historic-estates',
  'equestrian-estates',
  'new-developments',
  'golf-estates',
] as const;

export type Segment = (typeof SEGMENTS)[number];

export function isSegment(value: string): value is Segment {
  return (SEGMENTS as readonly string[]).includes(value);
}

/** Alias → canonical segment spellings. Grows with §15.4 expansion batches. */
const SEGMENT_ALIASES: Record<string, Segment> = {
  waterfront: 'waterfront-estates',
  'waterfront-homes': 'waterfront-estates',
  'seafront-villas': 'waterfront-estates',
  vineyards: 'vineyard-estates',
  'wine-estates': 'vineyard-estates',
  chalets: 'ski-chalets',
  'ski-homes': 'ski-chalets',
  penthouse: 'penthouses',
  'private-island': 'private-islands',
  islands: 'private-islands',
  'historic-homes': 'historic-estates',
  'heritage-estates': 'historic-estates',
  equestrian: 'equestrian-estates',
  'horse-farms': 'equestrian-estates',
  'new-builds': 'new-developments',
  'new-construction': 'new-developments',
  'golf-properties': 'golf-estates',
};

/**
 * Canonicalise a requested segment slug: lowercase, collapse separators,
 * apply aliases. Returns the canonical segment (caller 301s when it differs
 * from the input), or null when the token is outside the taxonomy.
 */
export function normalizeSegmentSlug(raw: string): Segment | null {
  const cleaned = decodeURIComponent(raw)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
  if (isSegment(cleaned)) return cleaned;
  return SEGMENT_ALIASES[cleaned] ?? null;
}

/** A segment → the shared property filter surface (listings, counts, "view all"). */
export function segmentToFilters(segment: Segment, marketId?: number): PropertyFilters {
  const byType: Partial<Record<Segment, string[]>> = {
    'waterfront-estates': ['estate', 'villa'],
    'vineyard-estates': ['estate', 'farmhouse'],
    'ski-chalets': ['chalet'],
    penthouses: ['penthouse'],
    'private-islands': ['private_island'],
    'historic-estates': ['estate', 'villa'],
    'equestrian-estates': ['estate', 'farmhouse'],
    'golf-estates': ['villa', 'estate'],
    // new-developments spans types; the editorial copy carries the page.
  };
  const filters: PropertyFilters = {};
  const types = byType[segment];
  if (types) filters.propertyTypes = types;
  if (marketId != null) filters.marketId = marketId;
  return filters;
}

/** §15.4 discipline: a stat counts only when value, source AND asOfDate are present. */
export function sourcedStatCount(market: Market): number {
  const stats = market.stats;
  if (!stats) return 0;
  let count = 0;
  for (const entry of Object.values(stats)) {
    if (
      entry &&
      typeof entry === 'object' &&
      (entry as { value?: unknown }).value != null &&
      (entry as { source?: unknown }).source &&
      (entry as { asOfDate?: unknown }).asOfDate
    ) {
      count += 1;
    }
  }
  return count;
}

function hasRealRichText(value: unknown, minChars = 40): boolean {
  if (!value) return false;
  const text = JSON.stringify(value);
  return (
    new RegExp(`"text":"[^"]{${minChars},}`).test(text) ||
    text.replace(/[^a-zA-Z]/g, '').length > minChars * 2
  );
}

/**
 * The §5.5 render gate for a market page: published editorial copy (intro)
 * plus at least three sourced data points. Ungated markets 404 and never
 * enter a sitemap.
 */
export function marketPassesGate(market: Market): boolean {
  return hasRealRichText(market.intro) && sourcedStatCount(market) >= 3;
}

/**
 * The §5.5 render gate for a market × segment page: its own published
 * editorial copy plus the market's three sourced data points.
 */
export function segmentPagePassesGate(page: SegmentPage, market: Market): boolean {
  if (page._status !== 'published') return false;
  return hasRealRichText(page.intro) && sourcedStatCount(market) >= 3;
}

/**
 * Sibling scoring for the §11.5 internal-links block (6–10 links): pages in
 * the same market rank first, then the same segment elsewhere.
 */
export function rankSegmentSiblings(
  current: SegmentPage,
  candidates: SegmentPage[],
  limit = 8,
): SegmentPage[] {
  const marketId = (page: SegmentPage): number | undefined => {
    const m = page.market;
    return m == null ? undefined : typeof m === 'object' ? m.id : m;
  };
  return candidates
    .filter((page) => page.id !== current.id)
    .map((page) => {
      let score = 0;
      if (marketId(page) !== undefined && marketId(page) === marketId(current)) score += 3;
      if (page.segment === current.segment) score += 2;
      return { page, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.page);
}
