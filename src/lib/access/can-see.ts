import { PUBLICLY_VISIBLE_STATUSES } from '@/lib/db/filters';

import { isActiveMember, type Viewer } from './viewer';

/** The §8.2 inputs — a structural subset so payload docs and search docs both fit. */
export interface CanSeeInput {
  channel?: string | null;
  status?: string | null;
  moderation?: string | null;
  isSample?: boolean | null;
  agency?: number | string | { id: number | string } | null;
  _status?: string | null;
}

function agencyIdOf(value: CanSeeInput['agency']): string | undefined {
  if (value == null) return undefined;
  return typeof value === 'object' ? String(value.id) : String(value);
}

function sampleAllowed(): boolean {
  return process.env.SAMPLE_DATA_ENABLED === 'true';
}

function statusPubliclyVisible(status: string | null | undefined): boolean {
  return (PUBLICLY_VISIBLE_STATUSES as readonly string[]).includes(status ?? '');
}

/**
 * §8.2 — THE visibility rule, verbatim:
 *
 *   canSee(viewer, property) =
 *     (property.channel = 'public')
 *       ? status is publicly visible AND (isSample allowed by config)
 *       : viewer.kind = 'member' AND viewer.status = 'active'
 *     OR viewer.kind = 'staff'
 *     OR (viewer.kind = 'agency' AND property.agency = viewer.agencyId)
 *
 * Plus the published-version and negative-moderation guards every public
 * query already applies. Off-market content is never a matter of CSS or a
 * client-side conditional — this function is the server-side check.
 */
export function canSee(viewer: Viewer, property: CanSeeInput): boolean {
  if (viewer.kind === 'staff') return true;
  if (viewer.kind === 'agency') {
    if (agencyIdOf(property.agency) === viewer.agencyId) return true;
  }

  // Everyone else only ever sees published, non-rejected documents.
  if (property._status && property._status !== 'published') return false;
  if (['rejected', 'changes_requested'].includes(property.moderation ?? '')) return false;

  if (property.channel === 'public') {
    if (!statusPubliclyVisible(property.status)) return false;
    if (property.isSample && !sampleAllowed()) return false;
    return true;
  }

  // Off-market: a confirmed, active member — nothing less (§2.3).
  if (!isActiveMember(viewer)) return false;
  if (!statusPubliclyVisible(property.status)) return false;
  if (property.isSample && !sampleAllowed()) return false;
  return true;
}
