import type { Access, CollectionConfig } from 'payload';

import { logAudit } from '@/lib/audit';
import { adminOnly, adminOrEditor, tenant } from '@/payload/access/tenant';
import { isMember } from '@/payload/access/member';

const ENQUIRY_SOURCES = [
  'listing',
  'off_market',
  'market_page',
  'report',
  'contact',
  'sell',
  'desk_call',
] as const;

const ENQUIRY_STATUSES = ['new', 'sent', 'viewed', 'qualified', 'spam'] as const;
const LOCALES = ['en', 'it', 'fr', 'de', 'es', 'ru'] as const;

// Staff/agency scoping via tenant(); a member may additionally read the
// enquiries they submitted while signed in (§11.7 "their own activity").
const readEnquiries: Access = (args) => {
  const user = args.req.user as unknown as { id: number; collection?: string } | null;
  if (isMember(user)) return { member: { equals: user?.id } };
  return tenant({ agentField: 'agent' })(args);
};

/**
 * §6.6 Enquiry. Site-side creation goes through the rate-limited route handler
 * using the local API — the REST surface never accepts anonymous writes.
 */
export const Enquiry: CollectionConfig = {
  slug: 'enquiries',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'property', 'source', 'status', 'createdAt'],
  },
  access: {
    read: readEnquiries,
    create: adminOrEditor,
    update: tenant({ agentField: 'agent' }),
    delete: adminOnly,
  },
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        if (operation === 'update' && previousDoc?.status !== doc.status) {
          const action = doc.status === 'viewed' ? 'enquiry_view' : 'status_change';
          await logAudit(req, action, 'enquiries', doc.id, `${previousDoc?.status} → ${doc.status}`);
        }
        return doc;
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text' },
    { name: 'message', type: 'textarea' },
    {
      name: 'property',
      type: 'relationship',
      relationTo: 'properties',
      index: true,
    },
    {
      name: 'agency',
      type: 'relationship',
      relationTo: 'agencies',
      index: true,
      admin: { description: 'Denormalised for routing and access scoping.' },
    },
    {
      name: 'agent',
      type: 'relationship',
      relationTo: 'agents',
      index: true,
      admin: { description: 'Routing target snapshot (property.agent at submission time).' },
    },
    {
      name: 'member',
      type: 'relationship',
      relationTo: 'members',
      index: true,
      admin: { description: 'Set when the enquirer was authenticated (§6.6).' },
    },
    { name: 'locale', type: 'select', options: [...LOCALES] },
    { name: 'source', type: 'select', required: true, options: [...ENQUIRY_SOURCES] },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      options: [...ENQUIRY_STATUSES],
    },
    {
      type: 'group',
      name: 'consent',
      fields: [
        { name: 'consentMarketing', type: 'checkbox', defaultValue: false },
        { name: 'consentedAt', type: 'date' },
        { name: 'consentIp', type: 'text' },
      ],
    },
    {
      name: 'reminderSentAt',
      type: 'date',
      admin: { readOnly: true, description: 'When the unanswered-enquiry reminder went out.' },
    },
    { name: 'utm', type: 'json' },
    { name: 'crmContactId', type: 'text', admin: { description: 'Reserved for the §23 CRM seam.' } },
  ],
};
