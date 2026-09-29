import { describe, expect, it } from 'vitest';

import type { Market, SegmentPage } from '@/payload-types';

import {
  SEGMENTS,
  isSegment,
  marketPassesGate,
  normalizeSegmentSlug,
  rankSegmentSiblings,
  segmentPagePassesGate,
  segmentToFilters,
  sourcedStatCount,
} from './segments';

const LONG_INTRO = {
  root: {
    children: [
      {
        children: [
          {
            text: 'A market introduction long enough to pass the editorial gate with real written copy in place.',
          },
        ],
      },
    ],
  },
};

function marketWith(stats: number): Market {
  const sourced = { value: 100, source: 'https://example.org/source', asOfDate: '2026-06-30' };
  return {
    id: 1,
    name: 'Test Market',
    slug: 'test-market',
    intro: LONG_INTRO,
    stats: {
      medianPriceEurPerSqm: stats >= 1 ? sourced : { value: 100 },
      primeEntryEur: stats >= 2 ? sourced : { value: null },
      yoyChangePct: stats >= 3 ? sourced : { value: 2, source: '', asOfDate: null },
      avgDaysOnMarket: stats >= 4 ? sourced : {},
    },
    updatedAt: '',
    createdAt: '',
  } as unknown as Market;
}

describe('the §5.5 segment taxonomy', () => {
  it('is the controlled nine-segment set', () => {
    expect(SEGMENTS).toHaveLength(9);
    expect(isSegment('waterfront-estates')).toBe(true);
    expect(isSegment('luxury-villas')).toBe(false);
  });

  it('normalises aliases to the canonical segment', () => {
    expect(normalizeSegmentSlug('waterfront')).toBe('waterfront-estates');
    expect(normalizeSegmentSlug('chalets')).toBe('ski-chalets');
    expect(normalizeSegmentSlug('Private-Island')).toBe('private-islands');
    expect(normalizeSegmentSlug('penthouse')).toBe('penthouses');
  });

  it('is idempotent on canonical slugs and null outside the taxonomy', () => {
    for (const segment of SEGMENTS) {
      expect(normalizeSegmentSlug(segment)).toBe(segment);
    }
    expect(normalizeSegmentSlug('castles')).toBeNull();
    expect(normalizeSegmentSlug('')).toBeNull();
  });

  it('maps segments onto the property filter surface', () => {
    expect(segmentToFilters('penthouses', 7)).toEqual({
      propertyTypes: ['penthouse'],
      marketId: 7,
    });
    expect(segmentToFilters('new-developments').propertyTypes).toBeUndefined();
  });
});

describe('the §5.5 render gates', () => {
  it('counts only fully sourced stats (value + source + asOfDate)', () => {
    expect(sourcedStatCount(marketWith(0))).toBe(0);
    expect(sourcedStatCount(marketWith(2))).toBe(2);
    expect(sourcedStatCount(marketWith(4))).toBe(4);
  });

  it('gates a market on editorial copy plus three sourced data points', () => {
    expect(marketPassesGate(marketWith(3))).toBe(true);
    expect(marketPassesGate(marketWith(2))).toBe(false);
    const noIntro = { ...marketWith(4), intro: null } as unknown as Market;
    expect(marketPassesGate(noIntro)).toBe(false);
  });

  it('gates a segment page on its own copy plus the market gate', () => {
    const page = {
      id: 10,
      _status: 'published',
      intro: LONG_INTRO,
      segment: 'penthouses',
      market: 1,
    } as unknown as SegmentPage;
    expect(segmentPagePassesGate(page, marketWith(3))).toBe(true);
    expect(segmentPagePassesGate(page, marketWith(2))).toBe(false);
    const draft = { ...page, _status: 'draft' } as unknown as SegmentPage;
    expect(segmentPagePassesGate(draft, marketWith(3))).toBe(false);
  });
});

describe('rankSegmentSiblings (§11.5 internal links)', () => {
  const page = (id: number, market: number, segment: string): SegmentPage =>
    ({ id, market, segment } as unknown as SegmentPage);

  it('ranks same-market first, then same-segment elsewhere, capped at the limit', () => {
    const current = page(1, 1, 'penthouses');
    const candidates = [
      page(2, 2, 'ski-chalets'),
      page(3, 1, 'waterfront-estates'),
      page(4, 2, 'penthouses'),
      current,
    ];
    const ranked = rankSegmentSiblings(current, candidates, 2);
    expect(ranked.map((p) => p.id)).toEqual([3, 4]);
  });
});
