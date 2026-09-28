import { activeFilterParams, parseSearchParams, type SearchParams } from './parse-search-params';
import type { PropertyFilters } from './filters';

// waterfront params describe one thing — the waterfront ask — so they relax
// together as a single "relax waterfront" link.
const LINKED: Record<string, string[]> = {
  waterfront: ['waterfront', 'water', 'minFrontage'],
  water: ['waterfront', 'water', 'minFrontage'],
  minFrontage: ['waterfront', 'water', 'minFrontage'],
};

export interface NarrowestFilterResult {
  /** URL params to remove for the one-click relax link. */
  params: string[];
  /** How many properties appear once relaxed. */
  count: number;
}

/**
 * The computed empty state (§4 decision 10): never generic — find the
 * most restrictive filter by counting what each one's removal would unlock,
 * and offer one click to relax it. `countFn` is injected so the heuristic is
 * unit-testable and engine-agnostic.
 */
export async function findNarrowestFilter(
  searchParams: SearchParams,
  countFn: (filters: PropertyFilters) => Promise<number>,
): Promise<NarrowestFilterResult | null> {
  const active = activeFilterParams(searchParams);
  if (active.length === 0) return null;

  const groups = new Map<string, string[]>();
  for (const param of active) {
    const group = LINKED[param] ?? [param];
    groups.set(group.join('+'), group);
  }

  let best: NarrowestFilterResult | null = null;
  for (const group of groups.values()) {
    const relaxed: SearchParams = { ...searchParams };
    for (const param of group) delete relaxed[param];
    try {
      const count = await countFn(parseSearchParams(relaxed));
      if (count > 0 && (best === null || count > best.count)) {
        best = { params: group, count };
      }
    } catch {
      // Counting engine unavailable — fall through to the generic empty state.
    }
  }
  return best;
}
