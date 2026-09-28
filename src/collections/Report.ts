import type { CollectionConfig } from 'payload';

import { revalidatePaths } from '@/lib/revalidate';
import { adminOrEditor, anyLoggedIn } from '@/payload/access/tenant';

/**
 * §6.7 Report — the intelligence library (§11.6): an ungated 400–600 word
 * summary with the key findings (the acquisition asset — it is what ranks and
 * what assistants cite), and a gated PDF that requires an account (the single
 * most efficient registration driver on the site). The PDF is a members-only
 * document served through the signed-URL route, never a public file.
 */
export const Report: CollectionConfig = {
  slug: 'reports',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publicationDate', '_status'],
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
        const paths = ['/intelligence'];
        if (typeof doc.slug === 'string' && doc.slug) paths.push(`/intelligence/${doc.slug}`);
        await revalidatePaths(paths);
        return doc;
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'summary',
      type: 'richText',
      localized: true,
      admin: {
        description:
          'Ungated, 400–600 words with the key findings and figures (§11.6). Public and indexable.',
      },
    },
    {
      name: 'pdf',
      type: 'relationship',
      relationTo: 'documents',
      admin: { description: 'Gated full report — requires an account, served via signed URL (§6.5).' },
    },
    {
      name: 'charts',
      type: 'json',
      admin: { description: 'Chart data for the summary page (§6.7); every series carries its source.' },
    },
    { name: 'publicationDate', type: 'date', required: true, index: true },
    {
      name: 'authors',
      type: 'array',
      fields: [{ name: 'name', type: 'text', required: true }],
    },
    {
      name: 'markets',
      type: 'relationship',
      relationTo: 'markets',
      hasMany: true,
      admin: { description: 'Cross-links to the relevant market pages (§11.5).' },
    },
    { name: 'metaTitle', type: 'text', localized: true },
    { name: 'metaDescription', type: 'textarea', localized: true },
  ],
};
