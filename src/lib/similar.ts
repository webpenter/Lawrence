import type { Where } from 'payload';

import type { Property } from '@/payload-types';

// Isolated comparable-listings logic (spec §11.3: "comparable properties in
// the same market and band") so it can be swapped for embeddings later
// without touching the page. Off-market listings are excluded from related
// suggestions entirely (§8.2) — both as subject candidates and results.

export const SIMILAR_PRICE_BAND = 0.35;

function relId(value: unknown): number | undefined {
  if (value == null) return undefined;
  return typeof value === 'object' ? (value as { id?: number }).id : (value as number);
}

/** Pure scoring predicate — unit-tested, engine-independent. */
export function isSimilar(subject: Property, candidate: Property): boolean {
  if (candidate.id === subject.id) return false;
  if (candidate.channel !== 'public') return false;
  if (['sold', 'expired', 'withdrawn', 'archived', 'draft'].includes(candidate.status)) return false;

  const sameMarket =
    relId(subject.location?.market) !== undefined &&
    relId(subject.location?.market) === relId(candidate.location?.market);

  const priceComparable =
    subject.priceEur != null &&
    candidate.priceEur != null &&
    candidate.priceEur >= subject.priceEur * (1 - SIMILAR_PRICE_BAND) &&
    candidate.priceEur <= subject.priceEur * (1 + SIMILAR_PRICE_BAND);

  return sameMarket || priceComparable;
}

/** Candidate-fetch Where clause: a superset the predicate then narrows. */
export function similarCandidatesWhere(subject: Property): Where {
  const clauses: Where[] = [
    { id: { not_equals: subject.id } },
    { channel: { equals: 'public' } },
    { status: { in: ['available', 'reserved', 'under_offer'] } },
  ];
  const or: Where[] = [];
  const marketId = relId(subject.location?.market);
  if (marketId !== undefined) {
    or.push({ 'location.market': { equals: marketId } });
  }
  if (subject.priceEur != null) {
    or.push({
      and: [
        { priceEur: { greater_than_equal: Math.round(subject.priceEur * (1 - SIMILAR_PRICE_BAND)) } },
        { priceEur: { less_than_equal: Math.round(subject.priceEur * (1 + SIMILAR_PRICE_BAND)) } },
      ],
    });
  }
  if (or.length > 0) clauses.push({ or });
  return { and: clauses };
}

/** Rank candidates: same market first, then closest price. */
export function rankSimilar(subject: Property, candidates: Property[], limit = 3): Property[] {
  const marketId = relId(subject.location?.market);
  return candidates
    .filter((candidate) => isSimilar(subject, candidate))
    .sort((a, b) => {
      const aMarket = relId(a.location?.market) === marketId ? 0 : 1;
      const bMarket = relId(b.location?.market) === marketId ? 0 : 1;
      if (aMarket !== bMarket) return aMarket - bMarket;
      const aPrice = Math.abs((a.priceEur ?? 0) - (subject.priceEur ?? 0));
      const bPrice = Math.abs((b.priceEur ?? 0) - (subject.priceEur ?? 0));
      return aPrice - bPrice;
    })
    .slice(0, limit);
}
