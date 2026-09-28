/**
 * §8.1 — The Viewer. Every data-layer call receives one explicitly; there is
 * no ambient current-user global, and a function that forgets the viewer does
 * not compile (the /lib/db signatures require it).
 */

export type Viewer =
  | { kind: 'anonymous' }
  | { kind: 'member'; id: string; status: 'active' | 'pending' | 'suspended' }
  | { kind: 'staff'; id: string; role: 'admin' | 'editor' }
  | { kind: 'agency'; id: string; agencyId: string }; // Track B

export const ANONYMOUS: Viewer = { kind: 'anonymous' };

/** An active member — the only member state that opens anything (§8.2). */
export function isActiveMember(viewer: Viewer): boolean {
  return viewer.kind === 'member' && viewer.status === 'active';
}

interface SessionUserLike {
  id: number | string;
  collection?: string;
  role?: string;
  status?: string;
  agency?: number | { id: number } | null;
}

/**
 * Map a Payload session user (staff `users` or `members`) onto the Viewer.
 * Null/undefined and anything unrecognised is anonymous — unknown never
 * means privileged.
 */
export function viewerFromUser(user: unknown): Viewer {
  const u = user as SessionUserLike | null | undefined;
  if (!u?.id) return ANONYMOUS;

  if (u.role === 'admin' || u.role === 'editor') {
    return { kind: 'staff', id: String(u.id), role: u.role };
  }

  if (u.role === 'agency_admin' || u.role === 'agency_agent') {
    const agencyId = typeof u.agency === 'object' ? u.agency?.id : u.agency;
    if (agencyId == null) return ANONYMOUS;
    return { kind: 'agency', id: String(u.id), agencyId: String(agencyId) };
  }

  if (u.collection === 'members' || (!u.role && u.status)) {
    const status = u.status === 'active' || u.status === 'pending' || u.status === 'suspended'
      ? u.status
      : 'suspended';
    return { kind: 'member', id: String(u.id), status };
  }

  return ANONYMOUS;
}
