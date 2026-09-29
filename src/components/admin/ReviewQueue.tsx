/* eslint-disable waterlineI18n/no-literal-jsx-text -- Payload backoffice UI is English-only, like every admin.description string */
import * as React from 'react';
import type { AdminViewServerProps } from 'payload';

import { ALLOWLIST } from '@/lib/access/projections';
import { lexicalToText, runPreChecks } from '@/lib/moderation/pre-checks';
import type { Property } from '@/payload-types';

/**
 * §9.4 — the /admin/review queue: submitted listings with their automated
 * checks and a publication preview (which fields a visitor vs a member would
 * see), decided with approve / request changes / reject. Server view; the
 * decision buttons are the small client island in ReviewDecision.tsx.
 */
export async function ReviewQueue(props: AdminViewServerProps) {
  const { payload, user } = props.initPageResult.req;
  const role = user && 'role' in user ? (user.role as string) : undefined;
  if (role !== 'admin' && role !== 'editor') {
    return <p style={{ padding: 32 }}>The review queue is for admins and editors.</p>;
  }

  const queue = await payload.find({
    collection: 'properties',
    where: { moderation: { in: ['unreviewed', 'changes_requested'] } },
    sort: 'updatedAt',
    limit: 50,
    depth: 1,
    draft: true,
    overrideAccess: true,
  });

  const { default: ReviewDecision } = await import('./ReviewDecision');

  const publicFields = [...ALLOWLIST.anonymous];
  const memberOnly = [...ALLOWLIST.member_public].filter(
    (field) => !ALLOWLIST.anonymous.has(field),
  );

  return (
    <div style={{ padding: 32, maxWidth: 960 }}>
      <h1 style={{ marginBottom: 4 }}>Review queue</h1>
      <p style={{ marginBottom: 24 }}>
        {queue.totalDocs} listing{queue.totalDocs === 1 ? '' : 's'} awaiting a decision.
        Approve publishes (the €20M admission and prime cap still apply); notes reach the
        agency by email.
      </p>

      {queue.docs.map((doc) => {
        const property = doc as Property;
        const agency = typeof property.agency === 'object' ? property.agency : null;
        const flags = runPreChecks({
          coordinates: (property.location?.coordinates as [number, number] | undefined) ?? null,
          priceEur: property.priceEur ?? null,
          internalValueEur: property.internalValueEur ?? null,
          valueTier: property.valueTier ?? null,
          imageCount: property.media?.length ?? 0,
          descriptionText: lexicalToText(property.description),
          title: property.title ?? '',
        });
        return (
          <section
            key={property.id}
            style={{
              border: '1px solid var(--theme-elevation-150)',
              padding: 20,
              marginBottom: 20,
            }}
          >
            <h2 style={{ margin: 0 }}>
              <a href={`/admin/collections/properties/${property.id}`}>{property.title}</a>
            </h2>
            <p style={{ margin: '4px 0 12px', color: 'var(--theme-elevation-400)' }}>
              {agency?.name ?? '—'} · {property.reference ?? 'no reference'} ·{' '}
              {property.moderation} · updated {String(property.updatedAt).slice(0, 16)}
            </p>

            <h3 style={{ margin: '0 0 4px' }}>Automated checks</h3>
            {flags.length === 0 ? (
              <p style={{ margin: '0 0 12px', color: 'var(--theme-success-500)' }}>
                All checks pass.
              </p>
            ) : (
              <ul style={{ margin: '0 0 12px', color: 'var(--theme-error-500)' }}>
                {flags.map((flag) => (
                  <li key={flag.code}>
                    <strong>{flag.code}</strong>: {flag.message}
                  </li>
                ))}
              </ul>
            )}
            <p style={{ margin: '0 0 12px', color: 'var(--theme-elevation-400)' }}>
              EXIF stripping and the 2000px minimum are enforced at upload; every attached
              image has already passed both.
            </p>

            <h3 style={{ margin: '0 0 4px' }}>Publication preview</h3>
            <p style={{ margin: '0 0 12px', color: 'var(--theme-elevation-400)' }}>
              A visitor sees {publicFields.length} allowlisted fields
              {property.channel === 'off_market'
                ? ' — none, this is off-market: the public page 404s'
                : ''}
              ; a member additionally sees: {memberOnly.join(', ') || '—'}. Preview as
              visitor:{' '}
              {property.channel === 'off_market' || !property.slug ? (
                <em>no public URL (off-market)</em>
              ) : (
                <a href={`/en/property/${property.slug}`} target="_blank" rel="noreferrer">
                  /en/property/{property.slug}
                </a>
              )}
            </p>

            <ReviewDecision propertyId={property.id} />
          </section>
        );
      })}
    </div>
  );
}

export default ReviewQueue;
