import { describe, expect, it } from 'vitest';

import { averageResponseHours, classifyAttention, leadsPerWeek } from './metrics';

const NOW = new Date('2026-09-22T12:00:00Z'); // a Tuesday

describe('leadsPerWeek (Prompt 15 charts)', () => {
  it('zero-fills the trailing weeks and buckets by ISO Monday', () => {
    const weeks = leadsPerWeek([], NOW, 4);
    expect(weeks).toHaveLength(4);
    expect(weeks[3]?.weekOf).toBe('2026-09-21'); // this week's Monday
    expect(weeks.every((w) => w.total === 0)).toBe(true);
  });

  it('counts by week and source, ignoring out-of-window leads', () => {
    const weeks = leadsPerWeek(
      [
        { createdAt: '2026-09-21T09:00:00Z', updatedAt: '', status: 'new', source: 'property' },
        { createdAt: '2026-09-15T09:00:00Z', updatedAt: '', status: 'new', source: 'landing' },
        { createdAt: '2026-09-16T09:00:00Z', updatedAt: '', status: 'new', source: 'property' },
        { createdAt: '2020-01-01T00:00:00Z', updatedAt: '', status: 'new', source: 'property' },
      ],
      NOW,
      2,
    );
    expect(weeks[0]).toMatchObject({ weekOf: '2026-09-14', total: 2 });
    expect(weeks[0]?.bySource).toEqual({ landing: 1, property: 1 });
    expect(weeks[1]).toMatchObject({ weekOf: '2026-09-21', total: 1 });
  });
});

describe('averageResponseHours (§8.10)', () => {
  it('averages only answered leads', () => {
    const hours = averageResponseHours([
      { createdAt: '2026-09-20T00:00:00Z', updatedAt: '2026-09-20T06:00:00Z', status: 'viewed' },
      { createdAt: '2026-09-20T00:00:00Z', updatedAt: '2026-09-20T18:00:00Z', status: 'qualified' },
      { createdAt: '2026-09-20T00:00:00Z', updatedAt: '2026-09-22T00:00:00Z', status: 'new' },
    ]);
    expect(hours).toBe(12);
  });

  it('returns null with nothing answered', () => {
    expect(averageResponseHours([{ createdAt: '', updatedAt: '', status: 'new' }])).toBeNull();
  });
});

describe('classifyAttention (§8.10)', () => {
  const base = {
    id: 1,
    title: 'Villa',
    status: 'available',
    moderation: 'approved',
    marketId: 7,
    hasValue: true,
    expiresAt: '2026-12-01T00:00:00Z',
  };

  it('returns no reasons for a healthy listing', () => {
    expect(classifyAttention(base, NOW)).toEqual([]);
  });

  it('collects every applicable reason', () => {
    const reasons = classifyAttention(
      {
        ...base,
        moderation: 'changes_requested',
        marketId: null,
        hasValue: false,
        expiresAt: '2026-09-30T00:00:00Z',
      },
      NOW,
    );
    expect(reasons).toEqual([
      'changes_requested',
      'missing_market',
      'missing_value',
      'expiring',
    ]);
  });

  it('only flags expiry for live listings', () => {
    expect(
      classifyAttention({ ...base, status: 'sold', expiresAt: '2026-09-23T00:00:00Z' }, NOW),
    ).toEqual([]);
  });
});
