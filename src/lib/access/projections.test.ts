import { describe, expect, it } from 'vitest';

import { audienceFor, projectProperty, type Audience } from './projections';
import type { Viewer } from './viewer';

const ANON: Viewer = { kind: 'anonymous' };
const MEMBER: Viewer = { kind: 'member', id: '1', status: 'active' };
const PENDING: Viewer = { kind: 'member', id: '2', status: 'pending' };
const STAFF: Viewer = { kind: 'staff', id: '3', role: 'admin' };

const FULL_DOC = {
  id: 42,
  slug: 'palazzo-portofino',
  title: 'Palazzo sul Mare',
  propertyType: 'palazzo',
  channel: 'public',
  status: 'available',
  valueTier: 'trophy',
  priceType: 'fixed',
  priceDisclosure: 'exact',
  currency: 'EUR',
  priceAmount: 34_500_000,
  priceEur: 34_500_000,
  priceBandMin: null,
  priceBandMax: null,
  priceBandMinEur: null,
  priceBandMaxEur: null,
  internalValueEur: 36_000_000,
  commissionTerms: '2.5% sole mandate',
  mandateType: 'exclusive',
  annualRunningCostEur: 420_000,
  ownershipStructure: 'spv',
  saleStructure: 'share_transfer',
  bedrooms: 9,
  description: { root: 'rich text' },
  provenance: { root: 'history' },
  moderation: 'unreviewed',
  moderationNote: 'internal note',
  fingerprint: 'abc123',
  viewCount: 999,
  memberViewCount: 44,
  enquiryCount: 7,
  media: [
    { id: 1, visibility: 'public', alt: 'facade' },
    { id: 2, visibility: 'members', alt: 'interior' },
  ],
  floorplans: [{ id: 3 }],
  documents: [{ id: 4 }],
  location: {
    label: 'Portofino, Liguria',
    addressLine: 'Via Roma 1, 16034 Portofino',
    locality: 'Portofino',
    province: 'GE',
    region: 'Liguria',
    country: 'IT',
    market: 7,
    coordinates: [9.2099, 44.3034] as [number, number],
    coordinatePrecision: 'approximate_500m',
    publicGeography: 'locality',
  },
} as const;

function project(viewer: Viewer, overrides: Record<string, unknown> = {}) {
  return projectProperty(viewer, { ...FULL_DOC, ...overrides });
}

describe('audienceFor (§8.3 columns)', () => {
  const CASES: Array<[string, Viewer, string, Audience]> = [
    ['anonymous / public', ANON, 'public', 'anonymous'],
    ['pending member is the public audience', PENDING, 'public', 'anonymous'],
    ['active member / public listing', MEMBER, 'public', 'member_public'],
    ['active member / off-market', MEMBER, 'off_market', 'member_off_market'],
    ['staff', STAFF, 'off_market', 'staff'],
  ];
  it.each(CASES)('%s', (_n, viewer, channel, expected) => {
    expect(audienceFor(viewer, { channel })).toBe(expected);
  });
});

describe('projections (§8.3) — the allowlist table, row by row', () => {
  it('row 10: internalValueEur, commissionTerms, moderation internals NEVER leave the staff column', () => {
    for (const viewer of [ANON, MEMBER, PENDING]) {
      const out = project(viewer);
      expect(out).not.toHaveProperty('internalValueEur');
      expect(out).not.toHaveProperty('commissionTerms');
      expect(out).not.toHaveProperty('moderationNote');
      expect(out).not.toHaveProperty('moderation');
      expect(out).not.toHaveProperty('fingerprint');
      expect(out).not.toHaveProperty('viewCount');
      expect(JSON.stringify(out)).not.toContain('36000000');
      expect(JSON.stringify(out)).not.toContain('sole mandate');
    }
    expect(project(STAFF).internalValueEur).toBe(36_000_000);
  });

  it('row 6: addressLine and exact coordinates never reach non-staff', () => {
    for (const viewer of [ANON, MEMBER]) {
      const out = project(viewer);
      const location = out.location as Record<string, unknown>;
      expect(location).not.toHaveProperty('addressLine');
      // approximate_500m: the point is jittered, never the exact pin.
      expect(location.coordinates).not.toEqual([9.2099, 44.3034]);
      expect(JSON.stringify(out)).not.toContain('Via Roma');
    }
    const staffLocation = project(STAFF).location as Record<string, unknown>;
    expect(staffLocation.addressLine).toBe('Via Roma 1, 16034 Portofino');
    expect(staffLocation.coordinates).toEqual([9.2099, 44.3034]);
  });

  it('locality_only sends no coordinates at all to non-staff', () => {
    const out = project(ANON, {
      location: { ...FULL_DOC.location, coordinatePrecision: 'locality_only' },
    });
    expect((out.location as Record<string, unknown>).coordinates).toBeNull();
  });

  it('exact precision shows the true pin publicly (seller permitted it, §4.8)', () => {
    const out = project(ANON, {
      location: { ...FULL_DOC.location, coordinatePrecision: 'exact' },
    });
    expect((out.location as Record<string, unknown>).coordinates).toEqual([9.2099, 44.3034]);
  });

  it('row 5 (anonymous): publicGeography=region hides locality and province', () => {
    const out = project(ANON, {
      location: { ...FULL_DOC.location, publicGeography: 'region' },
    });
    const location = out.location as Record<string, unknown>;
    expect(location.region).toBe('Liguria');
    expect(location.locality).toBeNull();
    expect(location.province).toBeNull();
    // Members still get the locality line (§8.3 member column).
    const memberLocation = project(MEMBER, {
      location: { ...FULL_DOC.location, publicGeography: 'region' },
    }).location as Record<string, unknown>;
    expect(memberLocation.locality).toBe('Portofino');
  });

  it('row 4 (price): per priceDisclosure for anonymous and member-on-public', () => {
    for (const viewer of [ANON, MEMBER]) {
      expect(project(viewer).priceEur).toBe(34_500_000); // exact

      const band = project(viewer, {
        priceDisclosure: 'band',
        priceBandMinEur: 30_000_000,
        priceBandMaxEur: 40_000_000,
      });
      expect(band).not.toHaveProperty('priceEur');
      expect(band.priceBandMinEur).toBe(30_000_000);

      const onRequest = project(viewer, { priceDisclosure: 'on_request' });
      expect(onRequest).not.toHaveProperty('priceEur');
      expect(onRequest).not.toHaveProperty('priceBandMinEur');
      // The raw amount fields are staff-only regardless of disclosure.
      expect(onRequest).not.toHaveProperty('priceAmount');
    }
  });

  it('rows 3+8: member-only assets, documents and floor plans are absent for anonymous, present for members', () => {
    const anon = project(ANON);
    expect((anon.media as unknown[]).length).toBe(1);
    expect(anon).not.toHaveProperty('floorplans');
    expect(anon).not.toHaveProperty('documents');
    expect(anon).not.toHaveProperty('annualRunningCostEur');
    expect(anon).not.toHaveProperty('ownershipStructure');

    const member = project(MEMBER);
    expect((member.media as unknown[]).length).toBe(2);
    expect(member.floorplans).toBeTruthy();
    expect(member.documents).toBeTruthy();
    expect(member.annualRunningCostEur).toBe(420_000);
    expect(member.ownershipStructure).toBe('spv');
  });

  it('rows 1–2, 7: title, type, facts, description, provenance reach every audience', () => {
    for (const viewer of [ANON, MEMBER, STAFF]) {
      const out = project(viewer);
      expect(out.title).toBe('Palazzo sul Mare');
      expect(out.propertyType).toBe('palazzo');
      expect(out.bedrooms).toBe(9);
      expect(out.description).toBeTruthy();
      expect(out.provenance).toBeTruthy();
    }
  });

  it('the allowlist is a real allowlist: an unknown new field is invisible everywhere below staff', () => {
    const out = project(ANON, { brandNewSecretField: 'surprise' });
    expect(out).not.toHaveProperty('brandNewSecretField');
    // Even staff do not receive fields nobody added to the table.
    expect(project(STAFF, { brandNewSecretField: 'surprise' })).not.toHaveProperty(
      'brandNewSecretField',
    );
  });
});
