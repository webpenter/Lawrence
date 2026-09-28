import type { Access, FieldAccess, Where } from 'payload';

// §6.6/§8: member-side access. Members authenticate against the `members`
// collection (separate from staff `users`); req.user.collection tells the two
// apart. Member data is isolated absolutely: a member only ever sees their own
// rows, staff (admin/editor) see all, and everyone else sees nothing.

interface AnyUser {
  id?: number | string;
  collection?: string;
  role?: string;
}

export function isStaff(user: unknown): boolean {
  // Only staff Users carry a role; members never do. Local-API callers may
  // pass a user without the runtime `collection` marker, so role is the key.
  const u = user as AnyUser | null | undefined;
  return u?.role === 'admin' || u?.role === 'editor';
}

export function isMember(user: unknown): boolean {
  return (user as AnyUser | null | undefined)?.collection === 'members';
}

/** The member themselves, or staff. For the members collection's own rows. */
export const memberSelfOrStaff: Access = ({ req }) => {
  const user = req.user as unknown as AnyUser | null;
  if (!user) return false;
  if (isStaff(user)) return true;
  if (isMember(user)) return { id: { equals: user.id } } satisfies Where;
  return false;
};

/**
 * Rows owned via a `member` relation (saved listings, requirements,
 * activity, enquiries): staff see all, a member sees only their own.
 */
export function ownedByMember(field = 'member'): Access {
  return ({ req }) => {
    const user = req.user as unknown as AnyUser | null;
    if (!user) return false;
    if (isStaff(user)) return true;
    if (isMember(user)) return { [field]: { equals: user.id } } satisfies Where;
    return false;
  };
}

/** Create as oneself: the hook pins `member` to the session, so any member may create. */
export const memberOrStaff: Access = ({ req }) => isStaff(req.user) || isMember(req.user);

/** Staff-only (admin/editor) — the member-side counterpart of adminOrEditor. */
export const staffOnly: Access = ({ req }) => isStaff(req.user);

export const staffOnlyField: FieldAccess = ({ req }) => isStaff(req.user);
