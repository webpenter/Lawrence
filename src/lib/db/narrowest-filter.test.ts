import { describe, expect, it } from 'vitest';

import { findNarrowestFilter } from './narrowest-filter';
import type { PropertyFilters } from './filters';

describe('findNarrowestFilter (computed empty state)', () => {
  it('identifies the filter whose removal unlocks the most results', async () => {
    const countFn = async (filters: PropertyFilters) => {
      if (filters.minFrontageM === undefined) return 42; // frontage was the blocker
      if (filters.bedsMin === undefined) return 3;
      return 0;
    };
    const result = await findNarrowestFilter(
      { minFrontage: '80', beds: '12', type: 'villa' },
      countFn,
    );
    expect(result).toEqual({ params: ['waterfront', 'water', 'minFrontage'], count: 42 });
  });

  it('relaxes the waterfront params as one unit', async () => {
    const countFn = async (filters: PropertyFilters) =>
      filters.waterBodyTypes === undefined && filters.minFrontageM === undefined ? 12 : 0;
    const result = await findNarrowestFilter({ water: 'sea', minFrontage: '40' }, countFn);
    expect(result).toEqual({ params: ['waterfront', 'water', 'minFrontage'], count: 12 });
  });

  it('returns null when no filters are active', async () => {
    expect(await findNarrowestFilter({ sort: 'newest' }, async () => 99)).toBeNull();
  });

  it('returns null when the counting engine is down', async () => {
    const result = await findNarrowestFilter({ water: 'sea' }, async () => {
      throw new Error('db down');
    });
    expect(result).toBeNull();
  });

  it('returns null when relaxing nothing helps', async () => {
    expect(await findNarrowestFilter({ water: 'sea', beds: '20' }, async () => 0)).toBeNull();
  });
});
