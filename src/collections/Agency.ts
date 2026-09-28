import type { CollectionConfig } from 'payload';

import { adminOnly, tenant, staffUser } from '@/payload/access/tenant';

const FEED_FORMATS = ['native_json', 'kyero_xml', 'resales_online', 'houzez_wp', 'generic_csv'] as const;
const AGENCY_TIERS = ['standard', 'verified', 'partner'] as const;
const LOCALES = ['en', 'it', 'fr', 'de', 'es', 'ru'] as const;

// Spec §6.8 Agency. §8.1: editors see agencies but never manage them;
// agency_admin manages only their own profile.
export const Agency: CollectionConfig = {
  slug: 'agencies',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'country', 'tier', 'verified'],
  },
  access: {
    read: tenant({ agencyField: 'id' }),
    create: adminOnly,
    update: tenant({ fullRoles: ['admin'], agencyField: 'id', denyAgents: true }),
    delete: adminOnly,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'logo', type: 'relationship', relationTo: 'media' },
    { name: 'description', type: 'textarea', localized: true },
    {
      name: 'country',
      type: 'text',
      maxLength: 2,
      admin: { description: 'ISO-3166-1 alpha-2.' },
    },
    {
      name: 'languages',
      type: 'select',
      hasMany: true,
      options: [...LOCALES],
    },
    { name: 'website', type: 'text' },
    { name: 'phone', type: 'text' },
    { name: 'whatsapp', type: 'text' },
    { name: 'email', type: 'email' },
    { name: 'licenceNumber', type: 'text' },
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: false,
      access: { update: ({ req }) => staffUser(req.user)?.role === 'admin' },
      admin: { position: 'sidebar' },
    },
    { name: 'verifiedAt', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'tier',
      type: 'select',
      defaultValue: 'standard',
      options: [...AGENCY_TIERS],
      access: { update: ({ req }) => staffUser(req.user)?.role === 'admin' },
      admin: {
        position: 'sidebar',
        description: 'verified tier auto-approves listings that pass automated validation (§8.2).',
      },
    },
    {
      name: 'listingQuota',
      type: 'number',
      min: 0,
      access: { update: ({ req }) => staffUser(req.user)?.role === 'admin' },
      admin: { position: 'sidebar' },
    },
    {
      type: 'group',
      name: 'feed',
      admin: { description: 'Inbound feed configuration (§8.5). Polled every 6 h.' },
      fields: [
        { name: 'feedUrl', type: 'text' },
        { name: 'feedToken', type: 'text', admin: { description: 'Per-agency ingest token.' } },
        { name: 'feedFormat', type: 'select', options: [...FEED_FORMATS] },
        { name: 'feedLastRunAt', type: 'date', admin: { readOnly: true } },
        { name: 'feedLastStatus', type: 'text', admin: { readOnly: true } },
        {
          name: 'fieldMapping',
          type: 'json',
          admin: { description: 'Source-field → schema mapping for generic feeds (§8.5).' },
        },
      ],
    },
    // Billing fields reserved and intentionally empty in Phase 1 (§6.8).
  ],
};
