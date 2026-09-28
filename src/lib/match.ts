import type { Property, Requirement } from '@/payload-types';

/**
 * §8.8 — matching, small and high-value: score active Requirement records
 * against a newly published off-market listing (budget overlap, market,
 * type, must-have features). One page and one function — deliberately
 * isolated so it can become embedding-based later without touching anything
 * else. Powers the "new off-market matches your requirements" email and the
 * admin matching board.
 */

function relId(value: unknown): number | undefined {
  if (value == null) return undefined;
  return typeof value === 'object' ? (value as { id?: number }).id : (value as number);
}

export interface MatchResult {
  matches: boolean;
  /** 0–100: how tightly the requirement fits — for admin board ordering. */
  score: number;
  reasons: string[];
}

/**
 * A requirement matches when nothing it states EXCLUDES the listing:
 * - budget: the enforca ble value must overlap the stated band (±10% grace
 *   at each end — nobody means their band to the euro at this level);
 * - markets: when stated, the listing's market must be one of them;
 * - property types: when stated, must include the listing's type;
 * - must-have features: every one must be present.
 * Unstated criteria never exclude. The score rewards stated-and-hit criteria
 * so tighter requirements rank above catch-alls on the admin board.
 */
export function matchRequirement(requirement: Requirement, listing: Property): MatchResult {
  const reasons: string[] = [];
  let stated = 0;
  let hit = 0;

  const value = listing.priceEur ?? listing.priceBandMaxEur ?? listing.priceBandMinEur ?? null;
  const min = requirement.budgetMinEur ?? null;
  const max = requirement.budgetMaxEur ?? null;
  if (min != null || max != null) {
    stated += 1;
    if (value == null) {
      return { matches: false, score: 0, reasons: ['listing has no comparable value'] };
    }
    const lower = min != null ? min * 0.9 : -Infinity;
    const upper = max != null ? max * 1.1 : Infinity;
    if (value < lower || value > upper) {
      return { matches: false, score: 0, reasons: ['outside budget'] };
    }
    hit += 1;
    reasons.push('budget');
  }

  const requiredMarkets = (requirement.markets ?? []).map(relId).filter((id) => id != null);
  if (requiredMarkets.length > 0) {
    stated += 1;
    const listingMarket = relId(listing.location?.market);
    if (listingMarket == null || !requiredMarkets.includes(listingMarket)) {
      return { matches: false, score: 0, reasons: ['wrong market'] };
    }
    hit += 1;
    reasons.push('market');
  }

  const types = requirement.propertyTypes ?? [];
  if (types.length > 0) {
    stated += 1;
    if (!types.includes(listing.propertyType)) {
      return { matches: false, score: 0, reasons: ['wrong property type'] };
    }
    hit += 1;
    reasons.push('type');
  }

  const mustHaves = requirement.mustHaveFeatures ?? [];
  if (mustHaves.length > 0) {
    stated += 1;
    const features = listing.features ?? [];
    const missing = mustHaves.filter((f) => !features.includes(f));
    if (missing.length > 0) {
      return { matches: false, score: 0, reasons: [`missing ${missing.join(', ')}`] };
    }
    hit += 1;
    reasons.push('features');
  }

  // A requirement that states nothing matches everything — but at score 0,
  // so the admin board ranks it last and the email still goes out.
  const score = stated === 0 ? 0 : Math.round((hit / 4) * 100);
  return { matches: true, score, reasons };
}

/** Filter + rank a batch of requirements for one listing (admin board order). */
export function rankMatches(
  requirements: Requirement[],
  listing: Property,
): Array<{ requirement: Requirement; score: number; reasons: string[] }> {
  return requirements
    .map((requirement) => ({ requirement, ...matchRequirement(requirement, listing) }))
    .filter((entry) => entry.matches)
    .sort((a, b) => b.score - a.score)
    .map(({ requirement, score, reasons }) => ({ requirement, score, reasons }));
}
