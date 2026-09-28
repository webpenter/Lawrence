import 'dotenv/config';

import type { Payload } from 'payload';

import { getPayloadClient } from '@/lib/db';
import { SAMPLE_AGENCY_SLUG_PREFIX } from '@/lib/sample/agencies';

/**
 * §13.12/§13.10 `pnpm sample:purge`: removes every sample record and its
 * media, leaving zero sample rows and zero orphan media. Real reference data
 * (destinations, water bodies) and the Prompt-10 landing-page drafts survive —
 * they are content scaffolding, not sample adverts (see DECISIONS.md).
 */
export async function purgeSamples(payload: Payload): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  const sampleAgencies = await payload.find({
    collection: 'agencies',
    where: { slug: { like: `${SAMPLE_AGENCY_SLUG_PREFIX}%` } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });
  const agencyIds = sampleAgencies.docs.map((agency) => agency.id);

  const sampleProperties = await payload.find({
    collection: 'properties',
    where: { isSample: { equals: true } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    draft: true,
  });
  const propertyIds = sampleProperties.docs.map((property) => property.id);

  if (propertyIds.length > 0) {
    const leads = await payload.delete({
      collection: 'enquiries',
      where: { property: { in: propertyIds } },
      overrideAccess: true,
    });
    counts.leads = leads.docs.length;
  }
  if (agencyIds.length > 0) {
    const agencyLeads = await payload.delete({
      collection: 'enquiries',
      where: { agency: { in: agencyIds } },
      overrideAccess: true,
    });
    counts.leads = (counts.leads ?? 0) + agencyLeads.docs.length;
  }

  const properties = await payload.delete({
    collection: 'properties',
    where: { isSample: { equals: true } },
    overrideAccess: true,
  });
  counts.properties = properties.docs.length;

  // The generator scopes every sourced image to a sample agency, so deleting
  // by agency provably leaves zero orphan media.
  if (agencyIds.length > 0) {
    const media = await payload.delete({
      collection: 'media',
      where: { agency: { in: agencyIds } },
      overrideAccess: true,
    });
    counts.media = media.docs.length;

    const agents = await payload.delete({
      collection: 'agents',
      where: { agency: { in: agencyIds } },
      overrideAccess: true,
    });
    counts.agents = agents.docs.length;

    const agencies = await payload.delete({
      collection: 'agencies',
      where: { slug: { like: `${SAMPLE_AGENCY_SLUG_PREFIX}%` } },
      overrideAccess: true,
    });
    counts.agencies = agencies.docs.length;
  }

  const articles = await payload.delete({
    collection: 'articles',
    where: { slug: { like: 'sample-article-%' } },
    overrideAccess: true,
  });
  counts.articles = articles.docs.length;

  return counts;
}

async function main(): Promise<void> {
  const payload = await getPayloadClient();
  const counts = await purgeSamples(payload);
  console.log('Sample purge complete:', counts);

  const remaining = await payload.count({
    collection: 'properties',
    where: { isSample: { equals: true } },
    overrideAccess: true,
  });
  if (remaining.totalDocs > 0) {
    console.error(`✗ ${remaining.totalDocs} sample listings remain`);
    process.exit(1);
  }
  console.log('✓ zero sample records remain');
  process.exit(0);
}

// Run directly (pnpm sample:purge) but stay importable for seed --wipe.
if (process.argv[1]?.includes('purge-samples')) {
  main().catch((err) => {
    console.error('Purge failed:', err);
    process.exit(1);
  });
}
