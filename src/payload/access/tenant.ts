import type { Access, FieldAccess, Where } from 'payload';

export type Role = 'admin' | 'editor' | 'agency_admin' | 'agency_agent';

export const ROLES: Role[] = ['admin', 'editor', 'agency_admin', 'agency_agent'];

interface TenantUser {
  role?: Role;
  agency?: number | { id: number } | null;
  agentProfile?: number | { id: number } | null;
}

export function relationId(
  value: number | { id: number } | null | undefined,
): number | undefined {
  if (value == null) return undefined;
  return typeof value === 'object' ? value.id : value;
}

export interface TenantOptions {
  /** Roles with unrestricted access. Default: admin + editor (spec §8.1 "see all"). */
  fullRoles?: Role[];
  /** Field path holding the owning agency id. null = no agency scoping at all. */
  agencyField?: string | null;
  /**
   * Field path that narrows agency_agent to "own only" (spec §8.1 row 1).
   * Omit to give agents the same scope as their agency.
   */
  agentField?: string;
  /** Set true to deny agency_agent entirely (e.g. audit log, import jobs). */
  denyAgents?: boolean;
  /** Set true to deny agency_admin too (admin/editor-only collections). */
  denyAgencyAdmins?: boolean;
}

/**
 * THE tenant access function (spec §8.1). Write one function and reuse it —
 * scattered per-collection logic is how tenant leaks happen. Returns `true`
 * for full-access roles, a Where clause scoping agency roles to their own
 * agency (and agents to their own docs), and `false` for everyone else.
 */
export function tenant(options: TenantOptions = {}): Access {
  const {
    fullRoles = ['admin', 'editor'],
    agencyField = 'agency',
    agentField,
    denyAgents = false,
    denyAgencyAdmins = false,
  } = options;

  return ({ req }) => {
    const user = req.user as TenantUser | null;
    if (!user?.role) return false;
    if (fullRoles.includes(user.role)) return true;

    if (user.role === 'agency_admin') {
      if (denyAgencyAdmins || agencyField === null) return false;
      const agencyId = relationId(user.agency);
      if (!agencyId) return false;
      return { [agencyField]: { equals: agencyId } } satisfies Where;
    }

    if (user.role === 'agency_agent') {
      if (denyAgents || denyAgencyAdmins || agencyField === null) return false;
      const agencyId = relationId(user.agency);
      if (!agencyId) return false;
      const agencyClause: Where = { [agencyField]: { equals: agencyId } };
      if (agentField) {
        const agentId = relationId(user.agentProfile);
        if (!agentId) return false;
        return { and: [agencyClause, { [agentField]: { equals: agentId } }] };
      }
      return agencyClause;
    }

    return false;
  };
}

/** Admin only. */
export const adminOnly: Access = ({ req }) =>
  (req.user as TenantUser | null)?.role === 'admin';

/** Admin or editor (content roles per §8.1: landing pages, journal, taxonomy). */
export const adminOrEditor: Access = ({ req }) => {
  const role = (req.user as TenantUser | null)?.role;
  return role === 'admin' || role === 'editor';
};

/** Field-level staff gate (§6.2/§6.4: internalValueEur, commissionTerms, addressLine). */
export const staffOnlyFieldAccess: FieldAccess = ({ req }) => {
  const role = (req.user as TenantUser | null)?.role;
  return role === 'admin' || role === 'editor';
};

/**
 * Any authenticated backoffice user — members are NOT staff. The auth
 * union puts members and users behind the same req.user, so backoffice
 * collections must check for a staff role, not mere authentication.
 */
export const anyLoggedIn: Access = ({ req }) => Boolean(req.user && 'role' in req.user);

export function isAgencyRole(role: string | undefined): boolean {
  return role === 'agency_admin' || role === 'agency_agent';
}

/**
 * req.user is a User | Member union since the members collection landed.
 * Staff/agency users are the ones carrying a `role`; members never do. This
 * narrows for call sites that read role/agency/agentProfile directly.
 */
export interface StaffUser extends TenantUser {
  id: number;
  collection?: string;
}

export function staffUser(user: unknown): StaffUser | null {
  if (user && typeof user === 'object' && 'role' in user) return user as StaffUser;
  return null;
}
