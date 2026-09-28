import { describe, expect, it } from 'vitest';

import { aliasFor, filtersToTypesense, sortToTypesense } from './schema';

describe('aliasFor (§7.1 — two physically separate collections)', () => {
  it('routes each audience to its own alias', () => {
    expect(aliasFor('public')).toBe('public_listings');
    expect(aliasFor('member')).toBe('member_listings');
  });
});

describe('filtersToTypesense — mirrors the Postgres path (Prompt 6 acceptance)', () => {
  it('always applies the publicly visible status filter', () => {
    expect(filtersToTypesense({})).toContain('status:=[`available`,`reserved`,`under_offer`]');
  });

  it('translates ranges, enums, geography and status', () => {
    const filterBy = filtersToTypesense({
      priceMinEur: 20_000_000,
      priceMaxEur: 80_000_000,
      valueTiers: ['trophy'],
      waterBodyTypes: ['sea', 'lake'],
      propertyTypes: ['villa'],
      features: ['helipad', 'private_dock'],
      country: 'IT',
      destinationId: 7,
      status: 'available',
      bedsMin: 6,
      bbox: { west: 8, south: 43, east: 10, north: 45 },
    });
    expect(filterBy).toContain('priceEur:>=20000000');
    expect(filterBy).toContain('priceEur:<=80000000');
    expect(filterBy).toContain('valueTier:=[`trophy`]');
    expect(filterBy).toContain('waterBodyType:=[`sea`,`lake`]');
    expect(filterBy).toContain('propertyType:=[`villa`]');
    expect(filterBy).toContain('features:=[`helipad`,`private_dock`]');
    expect(filterBy).toContain('country:=`IT`');
    expect(filterBy).toContain('destinationId:=7');
    expect(filterBy).toContain('status:=`available`');
    expect(filterBy).toContain('bedrooms:>=6');
    expect(filterBy).toContain('location:(43,8,43,10,45,10,45,8)');
  });

  it('translates the waterfront sub-block filters', () => {
    const filterBy = filtersToTypesense({ waterAccess: true, minFrontageM: 25 });
    expect(filterBy).toContain('waterAccess:=true');
    expect(filterBy).toContain('waterFrontageM:>=25');
  });

  it('strips backticks so user input cannot escape its quoted token (no filter injection)', () => {
    const filterBy = filtersToTypesense({ country: 'IT`) || isSample:=true || (`' });
    // The stripped payload stays inside ONE backtick pair — it cannot close the
    // quote and inject additional clauses.
    expect(filterBy).toContain('country:=`IT) || isSample:=true || (`');
    expect(filterBy).not.toContain('``');
  });
});

describe('sortToTypesense', () => {
  it('maps every sort option', () => {
    expect(sortToTypesense('price_asc')).toBe('priceEur:asc');
    expect(sortToTypesense('price_desc')).toBe('priceEur:desc');
    expect(sortToTypesense(undefined)).toBe('publishedAtTs:desc');
  });
});
