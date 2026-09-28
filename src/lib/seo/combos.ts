import type { Where } from 'payload';

import type { PropertyFilters } from '@/lib/db/filters';
import type { LandingPage } from '@/payload-types';

/**
 * Programmatic landing-page grammar (§5.4):
 * /[locale]/waterfront/[propertyType]-[waterAccess]-[location], any segment
 * omittable. Exactly one canonical URL per combination — this module
 * normalises aliases so every variant 301s to the canonical slug, and maps a
 * LandingPage's combo group onto the search filter surface.
 */

/** Alias → canonical segment spellings. Grows with §14.4 expansion batches. */
const SEGMENT_ALIASES: Record<string, string> = {
  villa: 'villas',
  home: 'homes',
  house: 'houses',
  estate: 'estates',
  apartment: 'apartments',
  chalet: 'chalets',
  residence: 'residences',
  island: 'islands',
  'private-island': 'private-islands',
  seaside: 'sea',
  seafront: 'seafront',
  oceanfront: 'seafront',
  beach: 'beachfront',
  dock: 'private-dock',
  docks: 'private-dock',
  berth: 'private-dock',
  moorings: 'private-mooring',
  como: 'como',
  'lake-como': 'como',
  'cote-d-azur': 'cote-dazur',
  "cote-d'azur": 'cote-dazur',
};

/**
 * Canonicalise a requested combo slug: lowercase, collapse separators, apply
 * segment aliases. Pure and deterministic — unit-tested. Returns the slug to
 * 301 to when it differs from the input.
 */
export function normalizeComboSlug(raw: string): string {
  let slug = decodeURIComponent(raw)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');

  const aliasKeys = Object.keys(SEGMENT_ALIASES).sort((a, b) => b.length - a.length);
  const multiWordCanonicals = [...new Set(Object.values(SEGMENT_ALIASES))].filter((v) =>
    v.includes('-'),
  );

  // Protect already-canonical multi-word tokens so alias expansion is
  // idempotent: a canonical slug must always map to itself.
  // Underscores cannot survive the cleaning pass above, so this placeholder
  // never collides with real slug content.
  const protect = (_value: string, index: number) => `_c${index}_`;
  multiWordCanonicals.forEach((canonical, index) => {
    slug = slug.split(canonical).join(protect(canonical, index));
  });

  // Multi-word alias keys (whole-token, longest first), then single segments.
  for (const key of aliasKeys.filter((k) => k.includes('-'))) {
    const canonical = SEGMENT_ALIASES[key] as string;
    slug = slug
      .replace(new RegExp(`(^|-)${key}(-|$)`, 'g'), `$1${canonical}$2`)
      .replace(/-{2,}/g, '-');
  }
  slug = slug
    .split('-')
    .map((segment) => SEGMENT_ALIASES[segment] ?? segment)
    .join('-');

  multiWordCanonicals.forEach((canonical, index) => {
    slug = slug.split(protect(canonical, index)).join(canonical);
  });
  return slug;
}

/** A LandingPage's combo group → the shared filter surface (stats, listings, "view all"). */
export function comboToFilters(page: LandingPage): PropertyFilters {
  const filters: PropertyFilters = {};
  const combo = page.combo;
  if (!combo) return filters;
  if (combo.propertyType) filters.propertyTypes = [combo.propertyType];
  if (combo.waterBodyType) filters.waterBodyTypes = [combo.waterBodyType];
  if (combo.country) filters.country = combo.country;
  const destination = combo.destination;
  if (destination != null) {
    filters.marketId = typeof destination === 'object' ? destination.id : destination;
  }
  return filters;
}

/** The §5.5 query string for "view all" — search pre-filtered to this combo. */
export function comboToSearchQuery(page: LandingPage): string {
  const query = new URLSearchParams();
  const combo = page.combo;
  if (combo?.propertyType) query.set('type', combo.propertyType);
  if (combo?.waterBodyType) query.set('water', combo.waterBodyType);
  if (combo?.country) query.set('country', combo.country);
  const str = query.toString();
  return str ? `?${str}` : '';
}

/**
 * Sibling scoring for the internal-links block (§10.4: 6–10 siblings): pages
 * sharing a combo dimension rank above unrelated ones.
 */
export function rankSiblings(
  current: LandingPage,
  candidates: LandingPage[],
  limit = 8,
): LandingPage[] {
  const destId = (page: LandingPage): number | undefined => {
    const d = page.combo?.destination;
    return d == null ? undefined : typeof d === 'object' ? d.id : d;
  };
  return candidates
    .filter((page) => page.id !== current.id)
    .map((page) => {
      let score = 0;
      if (destId(page) !== undefined && destId(page) === destId(current)) score += 3;
      if (page.combo?.country && page.combo.country === current.combo?.country) score += 2;
      if (
        page.combo?.waterBodyType &&
        page.combo.waterBodyType === current.combo?.waterBodyType
      )
        score += 2;
      if (page.combo?.propertyType && page.combo.propertyType === current.combo?.propertyType)
        score += 1;
      return { page, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.page);
}

/** Where clause for published, non-empty landing pages — the §5.4 render gate. */
export function publishedLandingPagesWhere(): Where {
  return { _status: { equals: 'published' } };
}

/** The §5.4 gate: a combination renders only with published status and real editorial intro. */
export function passesEditorialGate(page: LandingPage): boolean {
  if (page._status !== 'published') return false;
  const intro = page.intro;
  if (!intro) return false;
  // Lexical rich text: require at least one non-empty text node.
  const text = JSON.stringify(intro);
  return /"text":"[^"]{40,}/.test(text) || text.replace(/[^a-zA-Z]/g, '').length > 80;
}
