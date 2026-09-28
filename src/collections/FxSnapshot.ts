import type { CollectionConfig } from 'payload';

import { adminOnly, anyLoggedIn } from '@/payload/access/tenant';

/**
 * §6.7 FxSnapshot — the daily ECB reference rates actually used for priceEur
 * (§6.2), kept as an auditable record: when a price was computed, the rate it
 * used is on file. Written by the fx cron route; hand edits are admin-only.
 */
export const FxSnapshot: CollectionConfig = {
  slug: 'fx-snapshots',
  admin: {
    useAsTitle: 'date',
    defaultColumns: ['date', 'source'],
  },
  access: {
    read: anyLoggedIn,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    { name: 'date', type: 'text', required: true, unique: true, index: true },
    {
      name: 'ratesPerEur',
      type: 'json',
      required: true,
      admin: { description: 'Units of each currency per 1 EUR: { USD, GBP, CHF, AED, SGD, HKD }.' },
    },
    { name: 'source', type: 'text', defaultValue: 'frankfurter/ecb' },
  ],
};
