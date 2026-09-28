import { describe, expect, it } from 'vitest';

import { parseKyeroFeed } from './adapters/kyero';
import { parseNativeJsonFeed } from './adapters/native-json';
import { imageUrlsFromRow, mapRowToListing } from './map-row';
import { validateRow, type RawRow } from './validate-row';

const VALID_ROW: RawRow = {
  reference: 'AG-001',
  title_en: 'Palazzo with private dock',
  description_en: 'A'.repeat(320),
  property_type: 'palazzo',
  status: 'draft',
  price_type: 'fixed',
  price_amount: '34500000',
  currency: 'EUR',
  bedrooms: '6',
  bathrooms: '5',
  built_area_sqm: '740',
  water_access: 'true',
  water_body_type: 'sea',
  water_frontage_m: '38',
  country: 'IT',
  locality: 'Portofino',
  latitude: '44.3034',
  longitude: '9.2099',
  image_urls: Array.from({ length: 6 }, (_, i) => `https://img.example/p${i}.jpg`).join('|'),
};

describe('validateRow (§9.4 dry-run report)', () => {
  it('passes a fully valid row with no issues', () => {
    const report = validateRow(VALID_ROW, 2);
    expect(report.status).toBe('ok');
    expect(report.issues).toEqual([]);
  });

  it('rejects a €5M row with the admission reason on the price column (acceptance)', () => {
    const report = validateRow({ ...VALID_ROW, price_amount: '5000000' }, 3);
    expect(report.status).toBe('error');
    const issue = report.issues.find((i) => i.column === 'price_amount');
    expect(issue?.reason).toContain('€10M');
  });

  it('only warns at €10–20M — the prime exception track decision is a human one', () => {
    const report = validateRow({ ...VALID_ROW, price_amount: '15000000' }, 3);
    expect(report.status).toBe('warning');
    expect(report.issues.find((i) => i.column === 'price_amount')?.reason).toMatch(/prime/i);
  });

  it('warns when a non-EUR row has no internal value to enforce on', () => {
    const report = validateRow({ ...VALID_ROW, currency: 'USD' }, 3);
    expect(report.status).toBe('warning');
    expect(report.issues.find((i) => i.column === 'internal_value_eur')?.reason).toMatch(/€20M/);
  });

  it('enforces on internal_value_eur when present', () => {
    const report = validateRow(
      { ...VALID_ROW, currency: 'USD', internal_value_eur: '26000000' },
      3,
    );
    expect(report.status).toBe('ok');
  });

  it('flags every missing required column by name', () => {
    const report = validateRow({ reference: 'X' }, 2);
    const columns = report.issues.filter((i) => i.severity === 'error').map((i) => i.column);
    for (const required of ['title_en', 'price_type', 'latitude', 'image_urls']) {
      expect(columns).toContain(required);
    }
  });

  it('rejects out-of-enum and non-numeric values with the offending value in the reason', () => {
    const report = validateRow(
      { ...VALID_ROW, property_type: 'timeshare', bedrooms: 'six' },
      2,
    );
    expect(report.status).toBe('error');
    expect(report.issues.find((i) => i.column === 'property_type')?.reason).toContain('timeshare');
    expect(report.issues.find((i) => i.column === 'bedrooms')?.reason).toContain('six');
  });

  it('warns (not errors) on fewer than 6 images', () => {
    const report = validateRow({ ...VALID_ROW, image_urls: 'https://img.example/a.jpg' }, 2);
    expect(report.status).toBe('warning');
    expect(report.issues.every((i) => i.severity === 'warning')).toBe(true);
  });

  it('rejects (0,0) coordinates', () => {
    const report = validateRow({ ...VALID_ROW, latitude: '0', longitude: '0' }, 2);
    expect(report.issues.some((i) => i.reason.includes('(0,0)'))).toBe(true);
  });
});

describe('mapRowToListing (§9.4)', () => {
  const mapped = mapRowToListing(VALID_ROW, 42);

  it('maps scalars, enums, the waterfront group and location correctly', () => {
    expect(mapped.agency).toBe(42);
    expect(mapped.priceAmount).toBe(34_500_000);
    expect(
      (mapped.waterfront as { waterAccess: boolean; waterFrontageM: number }).waterFrontageM,
    ).toBe(38);
    expect((mapped.location as { coordinates: number[] }).coordinates).toEqual([9.2099, 44.3034]);
    expect((mapped.location as { country: string }).country).toBe('IT');
  });

  it('never lets an import set lifecycle fields', () => {
    expect(mapped.status).toBe('draft');
    expect(mapped.moderation).toBe('unreviewed');
    expect(mapped.channel).toBe('public');
    expect(mapped).not.toHaveProperty('featured');
    expect(mapped).not.toHaveProperty('slug');
  });

  it('drops undefined keys so partial updates never blank existing data', () => {
    expect(Object.values(mapped).every((v) => v !== undefined)).toBe(true);
  });

  it('extracts and dedupes image urls', () => {
    expect(imageUrlsFromRow({ image_urls: 'https://a.jpg|https://a.jpg|https://b.jpg' })).toEqual([
      'https://a.jpg',
      'https://b.jpg',
    ]);
  });
});

const KYERO_SAMPLE = `<?xml version="1.0" encoding="utf-8"?>
<root>
  <kyero><feed_version>3</feed_version></kyero>
  <property>
    <id>77</id>
    <ref>KY-77</ref>
    <price>25000000</price>
    <currency>eur</currency>
    <type>villa</type>
    <town>Javea</town>
    <province>Alicante</province>
    <country>ES</country>
    <location><latitude>38.7894</latitude><longitude>0.1660</longitude></location>
    <beds>4</beds>
    <baths>3</baths>
    <surface_area><built>410</built><plot>1200</plot></surface_area>
    <desc><en>Seafront villa with mooring on the Arenal.</en></desc>
    <images>
      <image id="1"><url>https://img.example/ky1.jpg</url></image>
      <image id="2"><url>https://img.example/ky2.jpg</url></image>
    </images>
  </property>
</root>`;

describe('parseKyeroFeed (adapter)', () => {
  it('maps the Kyero shape onto the §9.4 columns', async () => {
    const rows = await parseKyeroFeed(KYERO_SAMPLE);
    expect(rows).toHaveLength(1);
    const row = rows[0] as RawRow;
    expect(row.reference).toBe('KY-77');
    expect(row.currency).toBe('EUR');
    expect(row.property_type).toBe('villa');
    expect(row.locality).toBe('Javea');
    expect(row.latitude).toBe('38.7894');
    expect(row.image_urls).toBe('https://img.example/ky1.jpg|https://img.example/ky2.jpg');
    expect(row.description_en).toContain('mooring');
  });

  it('applies the agency field mapping for columns Kyero lacks', async () => {
    const rows = await parseKyeroFeed(KYERO_SAMPLE, {
      'custom.description': 'description_en',
    });
    // No custom node in the sample: the dry-run report names exactly what the
    // agency still has to supply (the sample lacks a long-enough description
    // only warns; required columns error).
    const report = validateRow({ ...(rows[0] as RawRow), title_en: '' }, 2);
    expect(report.status).toBe('error');
    expect(report.issues.some((i) => i.column === 'title_en')).toBe(true);
  });
});

describe('parseNativeJsonFeed (native contract)', () => {
  it('normalises arrays and scalars onto the column shape', () => {
    const rows = parseNativeJsonFeed({
      listings: [
        {
          reference: 'NJ-1',
          features: ['helipad', 'private_dock'],
          water_frontage_m: 38,
          water_access: true,
        },
      ],
    });
    expect(rows[0]).toMatchObject({
      reference: 'NJ-1',
      features: 'helipad|private_dock',
      water_frontage_m: '38',
      water_access: 'true',
    });
  });

  it('rejects payloads that break the contract', () => {
    expect(() => parseNativeJsonFeed({ listings: [{}] })).toThrow();
    expect(() => parseNativeJsonFeed({ nope: [] })).toThrow();
  });
});
