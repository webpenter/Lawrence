import type { CollectionConfig } from 'payload';

import { revalidatePaths } from '@/lib/revalidate';
import { adminOrEditor, anyLoggedIn } from '@/payload/access/tenant';

// The Journal (§6.8, §10.5): editorial that answers real questions —
// mooring rules by country, buying a demanio marittimo concession, etc.
export const Article: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'publishedAt'],
  },
  versions: { drafts: { autosave: true } },
  access: {
    // Published articles are public content (§6.8); drafts stay backoffice-only.
    read: ({ req }) => (anyLoggedIn({ req }) ? true : { _status: { equals: 'published' } }),
    create: adminOrEditor,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  hooks: {
    afterChange: [
      async ({ doc }) => {
        const paths = ['/journal'];
        if (typeof doc.slug === 'string' && doc.slug) {
          paths.push(`/journal/${doc.slug}`);
        }
        await revalidatePaths(paths);
        return doc;
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        const paths = ['/journal'];
        if (typeof doc.slug === 'string' && doc.slug) {
          paths.push(`/journal/${doc.slug}`);
        }
        await revalidatePaths(paths);
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'excerpt', type: 'textarea', localized: true },
    { name: 'heroImage', type: 'relationship', relationTo: 'media' },
    { name: 'body', type: 'richText', localized: true },
    { name: 'author', type: 'relationship', relationTo: 'users' },
    { name: 'publishedAt', type: 'date', index: true },
    {
      name: 'isSample',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar', description: 'Demo data: SAMPLE notice, noindex, out of sitemaps.' },
    },
    { name: 'metaTitle', type: 'text', localized: true },
    { name: 'metaDescription', type: 'textarea', localized: true },
  ],
};
