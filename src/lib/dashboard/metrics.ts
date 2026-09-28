/**
 * §8.10 / Prompt 15 dashboard arithmetic, pure and unit-tested. The db layer
 * feeds these raw rows; the dashboard pages render the results read-only.
 */

export interface LeadRow {
  createdAt: string;
  updatedAt: string;
  status: string;
  source?: string | null;
}

export interface WeekBucket {
  /** ISO date (Monday) labelling the week. */
  weekOf: string;
  total: number;
  bySource: Record<string, number>;
}

function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Leads per week by source over the trailing `weeks`, oldest first, gaps zero-filled. */
export function leadsPerWeek(leads: LeadRow[], now: Date, weeks = 8): WeekBucket[] {
  const buckets = new Map<string, WeekBucket>();
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const week = mondayOf(new Date(now.getTime() - i * 7 * 24 * 3600_000));
    buckets.set(week, { weekOf: week, total: 0, bySource: {} });
  }
  for (const lead of leads) {
    const created = new Date(lead.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    const bucket = buckets.get(mondayOf(created));
    if (!bucket) continue;
    bucket.total += 1;
    const source = lead.source ?? 'unknown';
    bucket.bySource[source] = (bucket.bySource[source] ?? 0) + 1;
  }
  return [...buckets.values()];
}

/**
 * Average response time in hours: leads that left new/sent, measured
 * createdAt → updatedAt (the status transition touches updatedAt). Null when
 * nothing has been answered yet.
 */
export function averageResponseHours(leads: LeadRow[]): number | null {
  const answered = leads.filter((lead) => ['viewed', 'qualified'].includes(lead.status));
  if (answered.length === 0) return null;
  const totalMs = answered.reduce((sum, lead) => {
    const created = new Date(lead.createdAt).getTime();
    const updated = new Date(lead.updatedAt).getTime();
    return sum + Math.max(0, updated - created);
  }, 0);
  return Math.round((totalMs / answered.length / 3600_000) * 10) / 10;
}

export interface AttentionRow {
  id: number;
  title: string;
  status: string;
  moderation: string;
  marketId?: number | null;
  hasValue?: boolean;
  expiresAt?: string | null;
}

export type AttentionReason = 'missing_market' | 'expiring' | 'changes_requested' | 'missing_value';

/** §8.10 "listings needing attention", classified with every applicable reason. */
export function classifyAttention(
  listing: AttentionRow,
  now: Date,
  expiryWindowDays = 14,
): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  if (listing.moderation === 'changes_requested') reasons.push('changes_requested');
  if (listing.marketId == null) reasons.push('missing_market');
  if (listing.hasValue === false) reasons.push('missing_value');
  if (listing.expiresAt && ['available', 'reserved', 'under_offer'].includes(listing.status)) {
    const expires = new Date(listing.expiresAt).getTime();
    if (expires <= now.getTime() + expiryWindowDays * 24 * 3600_000) reasons.push('expiring');
  }
  return reasons;
}
