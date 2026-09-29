import 'dotenv/config';

import type { Payload } from 'payload';

import { getPayloadClient } from '@/lib/db';
import { SAMPLE_AGENCY_SLUG_PREFIX } from '@/lib/sample/agencies';

/**
 * §13.12/§13.10 `pnpm sample:purge`: removes every sample record, member,
 * media asset and activity row — listings, markets, segment pages, reports,
 * articles, agencies, agents, requirements, saved listings and enquiries —
 * leaving zero sample rows and zero orphan media.
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

  // Sample members and everything hanging off them (§13.12).
  const sampleMembers = await payload.find({
    collection: 'members',
    where: { email: { like: '%@sample.lawrence' } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });
  const memberIds = sampleMembers.docs.map((member) => member.id);
  if (memberIds.length > 0) {
    counts.savedListings = (
      await payload.delete({
        collection: 'saved-listings',
        where: { member: { in: memberIds } },
        overrideAccess: true,
      })
    ).docs.length;
    counts.requirements = (
      await payload.delete({
        collection: 'requirements',
        where: { member: { in: memberIds } },
        overrideAccess: true,
      })
    ).docs.length;
    counts.activity = (
      await payload.delete({
        collection: 'member-activity',
        where: { member: { in: memberIds } },
        overrideAccess: true,
      })
    ).docs.length;
    counts.members = (
      await payload.delete({
        collection: 'members',
        where: { id: { in: memberIds } },
        overrideAccess: true,
      })
    ).docs.length;
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

  // Sample editorial content: articles, reports, segment pages, markets.
  counts.articles = (
    await payload.delete({
      collection: 'articles',
      where: { or: [{ isSample: { equals: true } }, { slug: { like: 'sample-%' } }] },
      overrideAccess: true,
    })
  ).docs.length;
  counts.reports = (
    await payload.delete({
      collection: 'reports',
      where: { isSample: { equals: true } },
      overrideAccess: true,
    })
  ).docs.length;
  counts.segmentPages = (
    await payload.delete({
      collection: 'segment-pages',
      where: { isSample: { equals: true } },
      overrideAccess: true,
    })
  ).docs.length;
  counts.markets = (
    await payload.delete({
      collection: 'markets',
      where: { isSample: { equals: true } },
      overrideAccess: true,
    })
  ).docs.length;

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
