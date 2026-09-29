import { describe, expect, it } from 'vitest';

import { projectProperty } from '@/lib/access/projections';
import { ANONYMOUS } from '@/lib/access/viewer';
import type { Property } from '@/payload-types';

import { renderBrochure } from './render';

/**
 * §22-11B acceptance: "a public brochure contains no member-only field."
 * The mechanism is structural — the route projects for the session's viewer
 * before rendering, so the anonymous projection simply does not carry the
 * member/staff-only fields. This pins both halves: the projection strips the
 * canaries, and the renderer accepts the projected doc.
 */

const CANARY_ADDRESS = 'CANARY-14-Via-Segreta';
const CANARY_VALUE = 87_654_321;
const CANARY_COMMISSION = 'CANARY-3pc-sole-mandate';

const fixture = {
  id: 999,
  title: 'Test estate above the bay',
  slug: 'test-estate-above-the-bay',
  status: 'available',
  channel: 'public',
  priceDisclosure: 'exact',
  priceType: 'fixed',
  priceEur: 25_000_000,
  bedrooms: 6,
  builtAreaSqm: 900,
  location: {
    locality: 'Portofino',
    country: 'IT',
    addressLine: CANARY_ADDRESS,
  },
  internalValueEur: CANARY_VALUE,
  commissionTerms: CANARY_COMMISSION,
  updatedAt: '2026-09-01T00:00:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
} as unknown as Property;

describe('audience-aware brochure (§22-11B)', () => {
  it('the anonymous projection strips every member/staff-only canary', () => {
    const projected = projectProperty(
      ANONYMOUS,
      fixture as unknown as Record<string, unknown>,
    );
    const json = JSON.stringify(projected);
    expect(json).not.toContain(CANARY_ADDRESS);
    expect(json).not.toContain(String(CANARY_VALUE));
    expect(json).not.toContain(CANARY_COMMISSION);
  });

  it('renderBrochure produces a PDF from the projected (public) document', async () => {
    const projected = projectProperty(
      ANONYMOUS,
      fixture as unknown as Record<string, unknown>,
    ) as unknown as Property;
    const pdf = await renderBrochure(projected, 'en');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
