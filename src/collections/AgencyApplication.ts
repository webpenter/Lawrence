import type { CollectionConfig } from 'payload';
import { render } from '@react-email/components';

import { brand } from '@/config/brand';
import { sendEmail } from '@/lib/email/send';
import { AgencySetPasswordEmail } from '@/lib/email/templates/agency-emails';
import { logAudit } from '@/lib/audit';
import { adminOnly } from '@/payload/access/tenant';

/**
 * §9.4 agency onboarding: the application submitted at /sell, reviewed by an
 * admin. Approving one creates the Agency record and its agency_admin User,
 * and sends the set-password email — the agency never receives a password in
 * clear, only Payload's reset link.
 */
export const AgencyApplication: CollectionConfig = {
  slug: 'agency-applications',
  admin: {
    group: 'Desk',
    useAsTitle: 'agencyName',
    defaultColumns: ['agencyName', 'contactName', 'email', 'status', 'createdAt'],
  },
  access: {
    // Submissions arrive through /api/agency-application (local API);
    // reading and deciding is admin work.
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        const becameApproved =
          doc.status === 'approved' && previousDoc?.status !== 'approved';
        if (!becameApproved) return doc;

        // 1. The agency record (idempotent on the application email).
        const existingAgency = await req.payload.find({
          collection: 'agencies',
          where: { email: { equals: doc.email } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        });
        const agencyId =
          existingAgency.docs[0]?.id ??
          (
            await req.payload.create({
              collection: 'agencies',
              overrideAccess: true,
              data: {
                name: doc.agencyName,
                slug: doc.agencyName
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, ''),
                email: doc.email,
                country: doc.country ?? undefined,
                phone: doc.phone ?? undefined,
                tier: 'standard',
              } as never,
            })
          ).id;

        // 2. The agency_admin user (idempotent on email).
        const existingUser = await req.payload.find({
          collection: 'users',
          where: { email: { equals: doc.email } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        });
        if (!existingUser.docs[0]) {
          await req.payload.create({
            collection: 'users',
            overrideAccess: true,
            data: {
              email: doc.email,
              // Placeholder — never shared; replaced by the reset flow below.
              password: `onboard-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
              name: doc.contactName,
              role: 'agency_admin',
              agency: agencyId,
            } as never,
          });
        }

        // 3. The set-password email via Payload's reset token.
        try {
          const token = await req.payload.forgotPassword({
            collection: 'users',
            data: { email: doc.email },
            disableEmail: true,
          });
          const base = (process.env.NEXT_PUBLIC_SITE_URL ?? brand.siteUrl).replace(/\/$/, '');
          const component = AgencySetPasswordEmail({
            contactName: doc.contactName,
            agencyName: doc.agencyName,
            resetUrl: `${base}/admin/reset/${token}`,
          });
          await sendEmail({
            to: doc.email,
            subject: `Your ${brand.name} agency account`,
            html: await render(component),
            text: await render(component, { plainText: true }),
          });
        } catch (err) {
          req.payload.logger.warn(`[onboarding] set-password email failed: ${String(err)}`);
        }

        await logAudit(
          req,
          'update',
          'agency-applications',
          doc.id,
          `Application approved → agency ${agencyId} + agency_admin user`,
        );
        return doc;
      },
    ],
  },
  fields: [
    { name: 'agencyName', type: 'text', required: true },
    { name: 'contactName', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, index: true },
    { name: 'phone', type: 'text' },
    { name: 'country', type: 'text', maxLength: 2 },
    { name: 'website', type: 'text' },
    {
      name: 'inventoryNote',
      type: 'textarea',
      admin: { description: 'What they would list — markets, count, value range (§8.2).' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      options: ['new', 'approved', 'rejected'],
    },
    {
      name: 'reviewNote',
      type: 'textarea',
      admin: { description: 'Internal decision note.' },
    },
    {
      name: 'consentIp',
      type: 'text',
      admin: { readOnly: true },
    },
  ],
};
