import type { CollectionConfig } from 'payload';

import { revalidatePaths } from '@/lib/revalidate';
import { adminOrEditor, anyLoggedIn } from '@/payload/access/tenant';

import { PROPERTY_TYPES, WATER_BODY_TYPES } from './Property/enums';

// Programmatic SEO landing pages (§10.4, Prompt 10). A combo renders publicly
// only when it has genuine written copy — that gate keeps the engine out of
// thin-content territory.
export const LandingPage: CollectionConfig = {
  slug: 'landing-pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status'],
  },
  versions: { drafts: true },
  access: {
    read: anyLoggedIn,
    create: adminOrEditor,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  hooks: {
    afterChange: [
      async ({ doc }) => {
        const paths = ['/markets'];
        if (typeof doc.slug === 'string' && doc.slug) {
          paths.push(`/waterfront/${doc.slug}`);
        }
        await revalidatePaths(paths);
        return doc;
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        const paths = ['/markets'];
        if (typeof doc.slug === 'string' && doc.slug) {
          paths.push(`/waterfront/${doc.slug}`);
        }
        await revalidatePaths(paths);
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      type: 'group',
      name: 'combo',
      admin: { description: 'The filter combination this page targets.' },
      fields: [
        { name: 'propertyType', type: 'select', options: [...PROPERTY_TYPES] },
        { name: 'waterBodyType', type: 'select', options: [...WATER_BODY_TYPES] },
        { name: 'destination', type: 'relationship', relationTo: 'markets' },
        { name: 'country', type: 'text', maxLength: 2 },
      ],
    },
    {
      name: 'intro',
      type: 'richText',
      localized: true,
      admin: {
        description: 'Opens with a 40–60-word direct answer paragraph (§14.6). Required before the combo goes live.',
      },
    },
    { name: 'body', type: 'richText', localized: true },
    {
      name: 'faq',
      type: 'array',
      localized: true,
      admin: {
        description:
          'Question-form entries rendered as an accordion with FAQPage JSON-LD (§10.4/§14.3). Answer real buyer questions — mooring rules, tenure, access.',
      },
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
      ],
    },
    { name: 'metaTitle', type: 'text', localized: true },
    { name: 'metaDescription', type: 'textarea', localized: true },
  ],
};
