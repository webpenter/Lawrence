import type { CollectionConfig } from 'payload';

import { revalidatePaths } from '@/lib/revalidate';
import { SEGMENTS } from '@/lib/seo/segments';
import { adminOrEditor, anyLoggedIn } from '@/payload/access/tenant';

/**
 * §5.5 market × segment pages (e.g. /markets/cote-dazur/waterfront-estates).
 * The segment belongs to the controlled taxonomy; one page per combination;
 * a combination renders publicly only with published editorial copy plus the
 * market's three sourced data points — never auto-published.
 */
export const SegmentPage: CollectionConfig = {
  slug: 'segment-pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'segment', '_status'],
  },
  versions: { drafts: true },
  access: {
    read: anyLoggedIn,
    create: adminOrEditor,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  hooks: {
    beforeValidate: [
      // One canonical page per market × segment combination (§5.5).
      async ({ data, req, originalDoc }) => {
        if (!data?.market || !data?.segment) return data;
        const marketId = typeof data.market === 'object' ? data.market.id : data.market;
        const existing = await req.payload.find({
          collection: 'segment-pages',
          where: {
            and: [{ market: { equals: marketId } }, { segment: { equals: data.segment } }],
          },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        });
        const clash = existing.docs[0];
        if (clash && clash.id !== originalDoc?.id) {
          throw new Error(`A segment page for this market × ${data.segment} already exists.`);
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        const paths = ['/markets'];
        const market =
          typeof doc.market === 'object'
            ? doc.market
            : await req.payload
                .findByID({ collection: 'markets', id: doc.market, depth: 0, overrideAccess: true })
                .catch(() => null);
        if (market?.slug) {
          paths.push(`/markets/${market.slug}`, `/markets/${market.slug}/${doc.segment}`);
        }
        await revalidatePaths(paths);
        return doc;
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'market',
      type: 'relationship',
      relationTo: 'markets',
      required: true,
      index: true,
    },
    {
      name: 'segment',
      type: 'select',
      options: [...SEGMENTS],
      required: true,
      index: true,
      admin: { description: 'The §5.5 controlled taxonomy — never free text.' },
    },
    {
      name: 'intro',
      type: 'richText',
      localized: true,
      admin: {
        description:
          'Opens with a 40–60-word direct answer (§15.6). Required before the combination goes live.',
      },
    },
    { name: 'body', type: 'richText', localized: true },
    {
      name: 'faq',
      type: 'array',
      localized: true,
      admin: {
        description:
          'Question-form entries rendered with FAQPage JSON-LD (§15.5). Answer real buyer questions — tenure, structures, access.',
      },
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
      ],
    },
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
