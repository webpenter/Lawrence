import type { CollectionConfig } from 'payload';

import { adminOnly } from '@/payload/access/tenant';
import { ownedByMember } from '@/payload/access/member';

const ACTIVITY_ACTIONS = [
  'off_market_list',
  'off_market_view',
  'document_download',
  'saved',
  'enquiry',
] as const;

/**
 * §6.6/§8.7 MemberActivity — append-only, written server-side only (routes use
 * the local API with overrideAccess). It powers the admin's demand-per-listing
 * view, the "eleven members viewed your property this week" line, and match
 * notifications. It is not analytics for its own sake, and no third-party
 * script ever sees it. A member may read their own trail (§11.7), nobody
 * else's; deletion happens only through the §8.5 account-deletion anonymiser.
 */
export const MemberActivity: CollectionConfig = {
  slug: 'member-activity',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['member', 'action', 'property', 'at'],
  },
  access: {
    read: ownedByMember(),
    create: () => false,
    update: () => false,
    delete: adminOnly,
  },
  indexes: [{ fields: ['member', 'at'] }, { fields: ['property', 'at'] }],
  fields: [
    { name: 'member', type: 'relationship', relationTo: 'members', required: true, index: true },
    { name: 'property', type: 'relationship', relationTo: 'properties', index: true },
    { name: 'action', type: 'select', required: true, index: true, options: [...ACTIVITY_ACTIONS] },
    { name: 'at', type: 'date', required: true },
    { name: 'ip', type: 'text' },
    { name: 'userAgent', type: 'text' },
  ],
};
