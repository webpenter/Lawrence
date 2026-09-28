import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload';

import { FEATURES, PROPERTY_TYPES } from '@/collections/Property/enums';
import { isMember, memberOrStaff, ownedByMember } from '@/payload/access/member';

const TIMELINES = ['immediate', '6_months', '12_months', 'opportunistic'] as const;
const REQUIREMENT_STATUSES = ['active', 'paused', 'closed'] as const;
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'AED', 'SGD', 'HKD'] as const;

const pinToSession: CollectionBeforeChangeHook = ({ data, req }) => {
  const out = { ...data };
  if (isMember(req.user)) {
    out.member = req.user?.id;
  }
  return out;
};

/**
 * §6.6 Requirement — what the member is looking for. Feeds the §8.8 "new
 * off-market matches your requirements" email and the admin matching view.
 */
export const Requirement: CollectionConfig = {
  slug: 'requirements',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['member', 'status', 'budgetMinEur', 'budgetMaxEur', 'timeline'],
  },
  access: {
    read: ownedByMember(),
    create: memberOrStaff,
    update: ownedByMember(),
    delete: ownedByMember(),
  },
  hooks: { beforeChange: [pinToSession] },
  fields: [
    { name: 'member', type: 'relationship', relationTo: 'members', required: true, index: true },
    {
      type: 'row',
      fields: [
        { name: 'budgetMinEur', type: 'number', min: 0 },
        { name: 'budgetMaxEur', type: 'number', min: 0 },
        { name: 'currency', type: 'select', defaultValue: 'EUR', options: [...CURRENCIES] },
      ],
    },
    {
      name: 'markets',
      type: 'relationship',
      relationTo: 'markets',
      hasMany: true,
      index: true,
    },
    {
      name: 'propertyTypes',
      type: 'select',
      hasMany: true,
      options: [...PROPERTY_TYPES],
    },
    {
      name: 'mustHaveFeatures',
      type: 'select',
      hasMany: true,
      options: [...FEATURES],
    },
    { name: 'timeline', type: 'select', options: [...TIMELINES] },
    { name: 'notes', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      options: [...REQUIREMENT_STATUSES],
    },
    { name: 'notifyByEmail', type: 'checkbox', defaultValue: true },
  ],
};
