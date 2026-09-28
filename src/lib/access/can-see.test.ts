import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { canSee, type CanSeeInput } from './can-see';
import type { Viewer } from './viewer';

const ANON: Viewer = { kind: 'anonymous' };
const MEMBER: Viewer = { kind: 'member', id: '1', status: 'active' };
const PENDING: Viewer = { kind: 'member', id: '2', status: 'pending' };
const SUSPENDED: Viewer = { kind: 'member', id: '3', status: 'suspended' };
const STAFF: Viewer = { kind: 'staff', id: '4', role: 'editor' };
const AGENCY_A: Viewer = { kind: 'agency', id: '5', agencyId: '10' };

function listing(overrides: Partial<CanSeeInput> = {}): CanSeeInput {
  return {
    channel: 'public',
    status: 'available',
    moderation: 'unreviewed',
    isSample: false,
    agency: 10,
    _status: 'published',
    ...overrides,
  };
}

let prevSample: string | undefined;
beforeAll(() => {
  prevSample = process.env.SAMPLE_DATA_ENABLED;
  process.env.SAMPLE_DATA_ENABLED = 'false';
});
afterAll(() => {
  process.env.SAMPLE_DATA_ENABLED = prevSample;
});

// §8.2 verbatim, as a table: every viewer kind × the states that matter.
describe('canSee (§8.2) — table-driven', () => {
  const CASES: Array<[string, Viewer, Partial<CanSeeInput>, boolean]> = [
    // Public listings
    ['anonymous sees a live public listing', ANON, {}, true],
    ['anonymous sees under_offer', ANON, { status: 'under_offer' }, true],
    ['anonymous sees reserved', ANON, { status: 'reserved' }, true],
    ['anonymous never sees a draft status', ANON, { status: 'draft' }, false],
    ['anonymous never sees sold (page states are separate)', ANON, { status: 'sold' }, false],
    ['anonymous never sees withdrawn', ANON, { status: 'withdrawn' }, false],
    ['anonymous never sees an unpublished version', ANON, { _status: 'draft' }, false],
    ['anonymous never sees rejected moderation', ANON, { moderation: 'rejected' }, false],
    ['anonymous never sees changes_requested', ANON, { moderation: 'changes_requested' }, false],
    ['anonymous never sees samples when demo mode is off', ANON, { isSample: true }, false],

    // Off-market: the entire §2 business rule
    ['anonymous NEVER sees off-market', ANON, { channel: 'off_market' }, false],
    ['an active member sees off-market', MEMBER, { channel: 'off_market' }, true],
    ['a pending member does NOT see off-market', PENDING, { channel: 'off_market' }, false],
    ['a suspended member does NOT see off-market', SUSPENDED, { channel: 'off_market' }, false],
    ['a member does not see an unpublished off-market draft', MEMBER, { channel: 'off_market', _status: 'draft' }, false],
    ['a member does not see a withdrawn off-market listing', MEMBER, { channel: 'off_market', status: 'withdrawn' }, false],

    // Members on public listings behave like the public
    ['an active member sees a live public listing', MEMBER, {}, true],
    ['a pending member still sees the public collection', PENDING, {}, true],
    ['a suspended member still sees the public collection', SUSPENDED, {}, true],

    // Staff see everything
    ['staff see public drafts', STAFF, { _status: 'draft', status: 'draft' }, true],
    ['staff see off-market', STAFF, { channel: 'off_market' }, true],
    ['staff see rejected listings', STAFF, { moderation: 'rejected' }, true],

    // Agencies (Track B) see their own, nothing else beyond public
    ['agency sees its own off-market draft', AGENCY_A, { channel: 'off_market', _status: 'draft', agency: 10 }, true],
    ["agency does NOT see another agency's off-market listing", AGENCY_A, { channel: 'off_market', agency: 11 }, false],
    ["agency still sees other agencies' live public listings", AGENCY_A, { agency: 11 }, true],
  ];

  it.each(CASES)('%s', (_name, viewer, overrides, expected) => {
    expect(canSee(viewer, listing(overrides))).toBe(expected);
  });

  it('allows samples publicly when SAMPLE_DATA_ENABLED=true', () => {
    process.env.SAMPLE_DATA_ENABLED = 'true';
    expect(canSee(ANON, listing({ isSample: true }))).toBe(true);
    process.env.SAMPLE_DATA_ENABLED = 'false';
  });
});
