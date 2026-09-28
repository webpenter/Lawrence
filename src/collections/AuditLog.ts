import type { CollectionConfig } from 'payload';

import { tenant } from '@/payload/access/tenant';

// Spec §6.8: who changed what, when — required for multi-agency trust.
// §8.1 "View audit log": admin all, agency_admin own agency, editor/agents no.
// Entries are written exclusively by logAudit() with overrideAccess.
export const AuditLog: CollectionConfig = {
  slug: 'audit-logs',
  admin: {
    useAsTitle: 'summary',
    defaultColumns: ['action', 'targetCollection', 'targetId', 'actorEmail', 'createdAt'],
  },
  access: {
    read: tenant({ fullRoles: ['admin'], denyAgents: true }),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'action',
      type: 'select',
      required: true,
      index: true,
      options: ['create', 'update', 'delete', 'publish', 'enquiry_view', 'enquiry_anonymized', 'lead_view', 'lead_anonymized', 'status_change'],
    },
    { name: 'targetCollection', type: 'text', required: true, index: true },
    { name: 'targetId', type: 'text', required: true, index: true },
    { name: 'summary', type: 'text' },
    { name: 'actor', type: 'relationship', relationTo: 'users' },
    { name: 'actorEmail', type: 'text' },
    { name: 'actorRole', type: 'text' },
    { name: 'agency', type: 'relationship', relationTo: 'agencies', index: true },
  ],
};
