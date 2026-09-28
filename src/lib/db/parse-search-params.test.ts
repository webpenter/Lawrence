import { describe, expect, it } from 'vitest';

import { activeFilterParams, parseSearchParams, queryWithout } from './parse-search-params';

describe('parseSearchParams — the §11.2 URL contract', () => {
  it('parses a full browse URL exactly', () => {
    const filters = parseSearchParams({
      price: '20000000-80000000',
      tier: 'trophy,signature',
      type: 'villa,palazzo',
      features: 'helipad,private_dock',
      beds: '6',
      tenure: 'freehold',
      waterfront: '1',
      water: 'sea,lake',
      minFrontage: '25',
      bbox: '8.1,44.2,9.6,44.6',
      sort: 'price_desc',
      page: '2',
    });
    expect(filters).toEqual({
      priceMinEur: 20_000_000,
      priceMaxEur: 80_000_000,
      valueTiers: ['trophy', 'signature'],
      propertyTypes: ['villa', 'palazzo'],
      features: ['helipad', 'private_dock'],
      bedsMin: 6,
      tenures: ['freehold'],
      waterAccess: true,
      waterBodyTypes: ['sea', 'lake'],
      minFrontageM: 25,
      bbox: { west: 8.1, south: 44.2, east: 9.6, north: 44.6 },
      sort: 'price_desc',
      page: 2,
    });
  });

  it('drops values outside the controlled enums', () => {
    expect(parseSearchParams({ water: 'sea,jacuzzi' })).toEqual({ waterBodyTypes: ['sea'] });
    expect(parseSearchParams({ type: 'castle,timeshare' })).toEqual({
      propertyTypes: ['castle'],
    });
    expect(parseSearchParams({ tier: 'prime,bargain' })).toEqual({ valueTiers: ['prime'] });
    expect(parseSearchParams({ sort: 'random' })).toEqual({});
  });

  it('handles open-ended price ranges', () => {
    expect(parseSearchParams({ price: '20000000-' })).toEqual({ priceMinEur: 20_000_000 });
    expect(parseSearchParams({ price: '-50000000' })).toEqual({ priceMaxEur: 50_000_000 });
  });

  it('rejects malformed numbers, negative values and bad bboxes', () => {
    expect(parseSearchParams({ minFrontage: 'abc' })).toEqual({});
    expect(parseSearchParams({ beds: '-2' })).toEqual({});
    expect(parseSearchParams({ bbox: '10,44,8,45' })).toEqual({}); // west >= east
    expect(parseSearchParams({ bbox: '8,44,10' })).toEqual({});
  });

  it('parses booleans and country', () => {
    expect(parseSearchParams({ waterfront: '1', country: 'it' })).toEqual({
      waterAccess: true,
      country: 'IT',
    });
    expect(parseSearchParams({ waterfront: '0', country: 'italy' })).toEqual({});
  });
});

describe('activeFilterParams', () => {
  it('lists only params that parsed into real filters', () => {
    expect(
      activeFilterParams({ water: 'sea', tier: 'trophy', sort: 'newest', page: '3', beds: 'x' }),
    ).toEqual(['tier', 'water']);
  });
});

describe('queryWithout', () => {
  it('removes the named params and resets pagination', () => {
    expect(
      queryWithout({ water: 'sea', minFrontage: '25', waterfront: '1', page: '3' }, [
        'waterfront',
        'water',
        'minFrontage',
      ]),
    ).toBe('');
    expect(queryWithout({ water: 'sea', tier: 'trophy', page: '3' }, ['water'])).toBe(
      '?tier=trophy',
    );
  });

  it('returns an empty string when nothing remains', () => {
    expect(queryWithout({ water: 'sea' }, ['water'])).toBe('');
  });
});
