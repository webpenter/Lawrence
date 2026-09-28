import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload';

import { isMember, memberOrStaff, ownedByMember } from '@/payload/access/member';

/**
 * §6.6 SavedListing — member, property, private note, savedAt. The note is the
 * member's own scratchpad and no other audience (including the listing agency)
 * ever sees it.
 */
const pinToSession: CollectionBeforeChangeHook = ({ data, req, operation }) => {
  const out = { ...data };
  if (isMember(req.user)) {
    // A member always saves as themselves — the relation cannot be spoofed.
    out.member = req.user?.id;
  }
  if (operation === 'create' && !out.savedAt) out.savedAt = new Date().toISOString();
  return out;
};

export const SavedListing: CollectionConfig = {
  slug: 'saved-listings',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['member', 'property', 'savedAt'],
  },
  access: {
    read: ownedByMember(),
    create: memberOrStaff,
    update: ownedByMember(),
    delete: ownedByMember(),
  },
  hooks: { beforeChange: [pinToSession] },
  indexes: [{ fields: ['member', 'property'], unique: true }],
  fields: [
    { name: 'member', type: 'relationship', relationTo: 'members', required: true, index: true },
    { name: 'property', type: 'relationship', relationTo: 'properties', required: true, index: true },
    {
      name: 'note',
      type: 'textarea',
      admin: { description: 'Private to the member. Never shown to agencies or in analytics.' },
    },
    { name: 'savedAt', type: 'date', required: true },
  ],
};
