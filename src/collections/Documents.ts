import type { Access, CollectionConfig } from 'payload';

import { isAgencyRole, relationId, staffUser, tenant } from '@/payload/access/tenant';
import { isMember, isStaff } from '@/payload/access/member';

const DOCUMENT_TYPES = [
  'floor_plan',
  'brochure',
  'inventory',
  'survey',
  'report_pdf',
  'other',
] as const;

/**
 * §6.5 Document — floor plans, brochures, inventories, surveys. Members-only
 * by default: in production the files live in the PRIVATE bucket and are
 * delivered exclusively through /api/secure/document/[token] with a 15-minute
 * signed URL (src/lib/media/signed-url.ts); locally Payload's own file route
 * enforces this collection's read access. There is no public URL for a
 * document, ever — an unauthenticated request 404s.
 */
const readDocuments: Access = ({ req }) => {
  const user = req.user as unknown as
    | { id: number; collection?: string; role?: string; status?: string; agency?: unknown }
    | null;
  if (!user) return false;
  if (isStaff(user)) return true;
  if (isMember(user)) return user.status === 'active';
  if (isAgencyRole(user.role)) {
    const agencyId = relationId(user.agency as number | { id: number } | null);
    return agencyId ? { agency: { equals: agencyId } } : false;
  }
  return false;
};

export const Documents: CollectionConfig = {
  slug: 'documents',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'documentType', 'property', 'agency'],
    description: 'Private assets. Never in a sitemap, never cached publicly, never linked directly.',
  },
  access: {
    read: readDocuments,
    create: ({ req }) => Boolean(req.user && !isMember(req.user)),
    update: tenant(),
    delete: tenant({ fullRoles: ['admin'] }),
  },
  upload: {
    // PDFs, DWG exports, scans — no image processing.
    mimeTypes: ['application/pdf', 'image/*'],
    disableLocalStorage: false,
  },
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        const out = { ...data };
        const user = staffUser(req.user);
        if (user && isAgencyRole(user.role)) {
          out.agency = relationId(user.agency ?? null) ?? null;
        }
        return out;
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'documentType',
      type: 'select',
      required: true,
      defaultValue: 'other',
      options: [...DOCUMENT_TYPES],
    },
    { name: 'property', type: 'relationship', relationTo: 'properties', index: true },
    {
      name: 'agency',
      type: 'relationship',
      relationTo: 'agencies',
      index: true,
      admin: { description: 'Set automatically for agency uploads. Scopes edit access.' },
    },
    { name: 'credit', type: 'text' },
  ],
};
