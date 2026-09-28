import type { CollectionConfig, Field } from 'payload';

import { revalidatePaths } from '@/lib/revalidate';
import { adminOrEditor, anyLoggedIn } from '@/payload/access/tenant';

// §15.4 discipline: every published number carries a source URL and a date —
// that is what makes the research citable rather than decorative.
function sourcedStat(name: string, description?: string): Field {
  return {
    type: 'group',
    name,
    admin: description ? { description } : undefined,
    fields: [
      { name: 'value', type: 'number' },
      { name: 'source', type: 'text', admin: { description: 'Source URL — required for the stat to publish.' } },
      { name: 'asOfDate', type: 'date' },
    ],
  };
}

export const TRANSACTION_VOLUME_BANDS = ['under_10', '10_50', '50_200', 'over_200'] as const;

/**
 * §6.7 Market — the SEO engine's registry (Côte d'Azur, Lake Como, Gstaad…).
 * Maintained by editors; §5.5 market pages render only with published
 * editorial copy plus at least three sourced data points.
 */
export const Market: CollectionConfig = {
  slug: 'markets',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'country', 'slug'],
  },
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
        if (typeof doc.slug === 'string' && doc.slug) paths.push(`/markets/${doc.slug}`);
        await revalidatePaths(paths);
        return doc;
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        const paths = ['/markets'];
        if (typeof doc.slug === 'string' && doc.slug) paths.push(`/markets/${doc.slug}`);
        await revalidatePaths(paths);
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
      localized: true,
      admin: { description: 'Per-locale slug (§6.7); the §5.5 resolver 301s aliases to the canonical.' },
    },
    { name: 'country', type: 'text', maxLength: 2, index: true },
    { name: 'region', type: 'text' },
    {
      name: 'polygon',
      type: 'json',
      admin: { description: 'GeoJSON polygon of the market boundary (§6.7). Drawn from OSM/Natural Earth (§13.5).' },
    },
    { name: 'centroid', type: 'point' },
    { name: 'heroImage', type: 'relationship', relationTo: 'media' },
    { name: 'intro', type: 'richText', localized: true },
    {
      type: 'group',
      name: 'stats',
      admin: {
        description:
          'Editor-maintained market data (§6.7). Every value needs its source URL and as-of date to count toward the §5.5 three-sourced-data-points rule.',
      },
      fields: [
        sourcedStat('medianPriceEurPerSqm'),
        sourcedStat('primeEntryEur', 'Where prime pricing starts in this market.'),
        sourcedStat('yoyChangePct'),
        sourcedStat('avgDaysOnMarket'),
        {
          type: 'group',
          name: 'transactionVolumeBand',
          fields: [
            {
              name: 'value',
              type: 'select',
              options: [...TRANSACTION_VOLUME_BANDS],
              admin: { description: 'Transactions per year at this level — banded, never faked precision.' },
            },
            { name: 'source', type: 'text' },
            { name: 'asOfDate', type: 'date' },
          ],
        },
      ],
    },
    { name: 'metaTitle', type: 'text', localized: true },
    { name: 'metaDescription', type: 'textarea', localized: true },
  ],
};
