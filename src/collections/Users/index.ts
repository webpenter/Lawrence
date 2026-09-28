import type { Access, CollectionBeforeChangeHook, CollectionConfig, Where } from 'payload';
import { ValidationError } from 'payload';

import { logAudit } from '@/lib/audit';
import { adminOnly, isAgencyRole, relationId, staffUser, type Role } from '@/payload/access/tenant';

const AGENCY_ASSIGNABLE_ROLES: Role[] = ['agency_admin', 'agency_agent'];

// §8.1 "Manage users & roles": admin all; agency_admin own agents; everyone reads self.
const readUsers: Access = ({ req }) => {
  const user = staffUser(req.user);
  if (!user?.role) return false;
  if (user.role === 'admin' || user.role === 'editor') return true;
  const self: Where = { id: { equals: user.id } };
  if (user.role === 'agency_admin') {
    const agencyId = relationId(user.agency as number | { id: number } | null);
    if (agencyId) return { or: [self, { agency: { equals: agencyId } }] };
  }
  return self;
};

const writeUsers: Access = ({ req }) => {
  const user = staffUser(req.user);
  if (!user?.role) return false;
  if (user.role === 'admin') return true;
  const self: Where = { id: { equals: user.id } };
  if (user.role === 'agency_admin') {
    const agencyId = relationId(user.agency as number | { id: number } | null);
    if (agencyId) return { or: [self, { agency: { equals: agencyId } }] };
  }
  return self;
};

/**
 * Privilege-escalation guard: agency admins can only mint agency roles inside
 * their own agency; nobody edits their own role upwards; agency agents can
 * only touch their own profile fields.
 */
const guardRoleAssignment: CollectionBeforeChangeHook = ({ data, req, originalDoc }) => {
  const actor = staffUser(req.user);
  if (!actor?.role) return data;

  if (actor.role === 'admin') return data;

  const out = { ...data };
  const actorAgency = relationId(actor.agency as number | { id: number } | null);

  if (actor.role === 'agency_admin') {
    out.agency = actorAgency ?? null;
    const requestedRole = (out.role ?? originalDoc?.role) as Role | undefined;
    if (requestedRole && !AGENCY_ASSIGNABLE_ROLES.includes(requestedRole)) {
      throw new ValidationError({
        collection: 'users',
        errors: [
          { message: 'Agency admins can only assign agency roles.', path: 'role' },
        ],
      });
    }
    return out;
  }

  // editor / agency_agent: no role or agency changes at all.
  out.role = originalDoc?.role ?? 'agency_agent';
  out.agency = originalDoc?.agency ?? actorAgency ?? null;
  return out;
};

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role', 'agency'],
  },
  // §16.1 auth hardening: brute-force lockout at the collection level. TOTP
  // 2FA for admin/agency_admin is a deploy-time plugin install (Prompt 19/20,
  // see DECISIONS.md) — it needs a live admin UI to enrol against.
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
  },
  access: {
    read: readUsers,
    create: writeUsers,
    update: writeUsers,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [guardRoleAssignment],
    afterChange: [
      async ({ doc, req, operation }) => {
        await logAudit(req, operation === 'create' ? 'create' : 'update', 'users', doc.id, `role=${doc.role}`);
        return doc;
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        await logAudit(req, 'delete', 'users', doc.id, doc.email);
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'agency_agent',
      options: [
        { label: 'System Admin', value: 'admin' },
        { label: 'Editorial Editor', value: 'editor' },
        { label: 'Agency Admin', value: 'agency_admin' },
        { label: 'Agency Agent', value: 'agency_agent' },
      ],
      required: true,
    },
    {
      name: 'agency',
      type: 'relationship',
      relationTo: 'agencies',
      index: true,
      admin: { description: 'Required for agency roles. Scopes every query they make.' },
      validate: (value: unknown, { data }: { data: Partial<{ role: string }> }) => {
        if (isAgencyRole(data?.role) && !value) {
          return 'Agency roles must belong to an agency.';
        }
        return true;
      },
    },
    {
      name: 'agentProfile',
      type: 'relationship',
      relationTo: 'agents',
      admin: {
        description: 'Links an agency_agent user to their public agent profile for lead routing and "own listings" scoping.',
        condition: (data) => data?.role === 'agency_agent',
      },
    },
  ],
};
