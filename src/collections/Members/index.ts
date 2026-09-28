import type { Access, CollectionBeforeChangeHook, CollectionConfig } from 'payload';

import { logAudit } from '@/lib/audit';
import { isStaff, memberSelfOrStaff, staffOnlyField } from '@/payload/access/member';

const MEMBER_TYPES = ['buyer', 'advisor', 'broker', 'developer', 'other'] as const;
const MEMBER_STATUSES = ['active', 'pending', 'suspended'] as const;
const MEMBER_SOURCES = [
  'organic',
  'off_market_cta',
  'report_download',
  'enquiry',
  'referral',
] as const;
const LOCALES = ['en', 'it', 'fr', 'de', 'es', 'ru'] as const;

export function memberRequiresApproval(): boolean {
  return process.env.MEMBER_REQUIRE_APPROVAL === 'true';
}

/**
 * §2.3/§8.5: registration is two fields and a confirmation click. New accounts
 * are active unless the (off by default) MEMBER_REQUIRE_APPROVAL flag routes
 * them to pending — one flag, no migration. Consent metadata is stamped
 * server-side; lifecycle fields can never be self-assigned.
 */
const applyRegistrationPolicy: CollectionBeforeChangeHook = ({ data, req, operation, originalDoc }) => {
  const out = { ...data };
  const actor = req.user;
  const actorIsStaff = isStaff(actor);

  if (operation === 'create') {
    out.status = actorIsStaff && out.status ? out.status : memberRequiresApproval() ? 'pending' : 'active';
    if (!out.source) out.source = 'organic';
  } else if (!actorIsStaff) {
    // Members can never change their own lifecycle or provenance fields.
    out.status = originalDoc?.status;
    out.source = originalDoc?.source;
    out.utm = originalDoc?.utm;
  }

  // §12.3 consent: stamp when marketing consent flips on; clear when withdrawn.
  const hadConsent = Boolean(originalDoc?.marketingConsent);
  if (out.marketingConsent && !hadConsent) {
    out.consentedAt = new Date().toISOString();
    out.consentIp = req.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  } else if (out.marketingConsent === false) {
    out.consentedAt = null;
    out.consentIp = null;
  }

  // Payload's _verified flips on the email-confirmation click; mirror it into
  // the spec's emailVerifiedAt timestamp exactly once.
  if (out._verified && !originalDoc?.emailVerifiedAt) {
    out.emailVerifiedAt = new Date().toISOString();
  }

  return out;
};

/** Anyone may join (§2.3: friction is the enemy of the first 5,000 accounts). */
const createMember: Access = () => true;

export const Members: CollectionConfig = {
  slug: 'members',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'status', 'memberType', 'lastActiveAt'],
    description:
      'End users (the off-market audience) — entirely separate from staff Users. §6.6.',
  },
  auth: {
    // §2.3: email + password, email confirmation required, done. The magic-link
    // and TOTP routes (§8.5, optional in Phase 1) mount in Prompt 9 on
    // /api/member/* using src/lib/member/magic-link.ts.
    verify: true,
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    tokenExpiration: 60 * 60 * 24 * 14, // 14 days — a quiet, persistent session
  },
  access: {
    // Isolation is the Prompt 4 gate: a member reads and edits only themselves.
    read: memberSelfOrStaff,
    create: createMember,
    update: memberSelfOrStaff,
    delete: memberSelfOrStaff, // §8.5: members may delete their own account.
    admin: ({ req }) => isStaff(req.user),
  },
  hooks: {
    beforeChange: [applyRegistrationPolicy],
    afterLogin: [
      async ({ user, req }) => {
        try {
          await req.payload.update({
            collection: 'members',
            id: user.id,
            data: { lastActiveAt: new Date().toISOString() },
            overrideAccess: true,
          });
        } catch {
          // A failed timestamp must never fail a login.
        }
        return user;
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        await logAudit(req, 'delete', 'members', doc.id, 'account deleted');
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text' },
    { name: 'phone', type: 'text' },
    { name: 'country', type: 'text', maxLength: 2 },
    { name: 'preferredLocale', type: 'select', defaultValue: 'en', options: [...LOCALES] },
    {
      name: 'memberType',
      type: 'select',
      options: [...MEMBER_TYPES],
      admin: { description: 'Self-declared, optional, never gating (§6.6).' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      options: [...MEMBER_STATUSES],
      access: { update: staffOnlyField },
      admin: {
        description: 'pending only occurs while MEMBER_REQUIRE_APPROVAL=true (§2.3).',
      },
    },
    { name: 'emailVerifiedAt', type: 'date', admin: { readOnly: true } },
    { name: 'marketingConsent', type: 'checkbox', defaultValue: false },
    { name: 'consentedAt', type: 'date', admin: { readOnly: true } },
    { name: 'consentIp', type: 'text', admin: { readOnly: true }, access: { read: staffOnlyField } },
    { name: 'lastActiveAt', type: 'date', index: true, admin: { readOnly: true } },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'organic',
      options: [...MEMBER_SOURCES],
      access: { update: staffOnlyField },
    },
    { name: 'utm', type: 'json', access: { read: staffOnlyField, update: staffOnlyField } },
    {
      name: 'twoFactorEnabled',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Optional for members in Phase 1 (§6.6); enrolment UI lands in Prompt 9.' },
    },

    // ---- §6.6 reserved and unused: created now, never written to, so the
    // §23 heavier-gate seams are a flag rather than a migration. ----
    {
      type: 'group',
      name: 'reserved',
      admin: { description: 'Reserved for §23 (NDA / capability gating). Never written in Phase 1.' },
      access: { update: staffOnlyField },
      fields: [
        { name: 'ndaStatus', type: 'text' },
        { name: 'ndaSignedAt', type: 'date' },
        { name: 'capabilityStatus', type: 'text' },
        { name: 'capabilityBand', type: 'text' },
        { name: 'tier', type: 'text' },
      ],
    },
  ],
};
