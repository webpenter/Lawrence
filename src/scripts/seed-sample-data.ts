import 'dotenv/config';

import type { Payload } from 'payload';

import {
  composeDescription,
  composeTitle,
  DESCRIPTION_TEMPLATES,
  type DescriptionInput,
} from '@/content/description-templates';
import { getPayloadClient } from '@/lib/db';
import { textToLexical } from '@/lib/lexical';
import { SAMPLE_AGENCIES, SAMPLE_AGENTS } from '@/lib/sample/agencies';
import { SAMPLE_DESTINATIONS, SAMPLE_DESTINATION_BY_SLUG } from '@/lib/sample/destinations';
import { buildAllBlueprints, type ListingBlueprint } from '@/lib/sample/economics';
import { sourceGallery, type SourcedPhoto } from '@/lib/sample/unsplash';
import { purgeSamples } from '@/scripts/purge-samples';
import type { DestinationQueryKey } from '@/scripts/image-queries';
import { LANDING_PAGE_SEEDS } from '@/scripts/seed-data/landing-pages';

/**
 * §13.10 sample inventory generator. Deterministic and idempotent: every
 * record upserts on a stable natural key (slug / reference / email), so
 * running it twice produces identical data and no duplicates. §13.12 safety
 * rules are structural: isSample=true, fictional agencies on example.com,
 * jittered coordinates inside coastal boxes, no portrait media.
 *
 * Flags: --count=N (default 60) · --destination=slug · --wipe
 */

const LOCALES = ['en', 'it', 'fr', 'de', 'es', 'ru'] as const;

const ARTICLE_STUBS = [
  'Mooring and anchoring rules by country',
  'Buying a demanio marittimo concession in Italy, explained',
  'What “no fixed bridges” means and why Florida buyers pay for it',
  'Dredging, draft and why depth at the dock matters',
  'What a metre of private frontage is actually worth',
  'Buying a private island: the eight questions to ask first',
] as const;

function parseFlags(argv: string[]): { count: number; destination?: string; wipe: boolean } {
  const flags = { count: 60, destination: undefined as string | undefined, wipe: false };
  for (const arg of argv) {
    if (arg === '--wipe') flags.wipe = true;
    else if (arg.startsWith('--count=')) flags.count = Number(arg.slice(8)) || 60;
    else if (arg.startsWith('--destination=')) flags.destination = arg.slice(14);
  }
  return flags;
}

async function upsertBySlug(
  payload: Payload,
  collection: 'destinations' | 'water-bodies' | 'agencies' | 'landing-pages' | 'articles',
  slug: string,
  data: Record<string, unknown>,
  draft = false,
): Promise<number> {
  const existing = await payload.find({
    collection,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    draft,
  });
  if (existing.docs[0]) {
    const updated = await payload.update({
      collection,
      id: existing.docs[0].id,
      data: data as never,
      overrideAccess: true,
      draft,
    });
    return updated.id;
  }
  const created = await payload.create({
    collection,
    data: { ...data, slug } as never,
    overrideAccess: true,
    draft,
  });
  return created.id;
}

async function seedReferenceData(payload: Payload): Promise<{
  destinationIds: Map<string, number>;
  waterBodyIds: Map<string, number>;
}> {
  const destinationIds = new Map<string, number>();
  const waterBodyIds = new Map<string, number>();

  for (const destination of SAMPLE_DESTINATIONS) {
    if (!waterBodyIds.has(destination.waterBody.slug)) {
      waterBodyIds.set(
        destination.waterBody.slug,
        await upsertBySlug(payload, 'water-bodies', destination.waterBody.slug, {
          name: destination.waterBody.name,
          type: destination.waterBody.type,
        }),
      );
    }
    destinationIds.set(
      destination.slug,
      await upsertBySlug(payload, 'destinations', destination.slug, {
        name: destination.name,
        country: destination.country,
        region: destination.region,
      }),
    );
  }
  return { destinationIds, waterBodyIds };
}

async function seedAgencies(payload: Payload): Promise<{
  agencyIds: Map<string, number>;
  agentIdsByAgency: Map<string, number[]>;
}> {
  const agencyIds = new Map<string, number>();
  for (const agency of SAMPLE_AGENCIES) {
    agencyIds.set(
      agency.slug,
      await upsertBySlug(payload, 'agencies', agency.slug, {
        name: agency.name,
        country: agency.country,
        email: agency.email,
        description: agency.description,
        tier: agency.tier,
        verified: agency.tier === 'verified',
      }),
    );
  }

  const agentIdsByAgency = new Map<string, number[]>();
  for (const agent of SAMPLE_AGENTS) {
    const agencyId = agencyIds.get(agent.agencySlug) as number;
    const existing = await payload.find({
      collection: 'agents',
      where: { email: { equals: agent.email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const data = {
      name: agent.name,
      agency: agencyId,
      role: agent.role,
      email: agent.email,
      languages: agent.languages,
      receivesLeads: true,
    };
    const id = existing.docs[0]
      ? (await payload.update({ collection: 'agents', id: existing.docs[0].id, data: data as never, overrideAccess: true })).id
      : (await payload.create({ collection: 'agents', data: data as never, overrideAccess: true })).id;
    const list = agentIdsByAgency.get(agent.agencySlug) ?? [];
    list.push(id);
    agentIdsByAgency.set(agent.agencySlug, list);
  }
  return { agencyIds, agentIdsByAgency };
}

async function seedEditorialStubs(
  payload: Payload,
  destinationIds: Map<string, number>,
): Promise<void> {
  // 10 landing pages (drafts behind the §5.4 gate until sourced copy lands).
  for (const seed of LANDING_PAGE_SEEDS.slice(0, 10)) {
    const destinationSlug = [...SAMPLE_DESTINATION_BY_SLUG.values()].find(
      (d) => d.name === seed.destinationName,
    )?.slug;
    await upsertBySlug(
      payload,
      'landing-pages',
      seed.slug,
      {
        title: seed.title,
        _status: 'draft',
        combo: {
          propertyType: seed.propertyType,
          waterBodyType: seed.waterBodyType,
          country: seed.country,
          destination: destinationSlug ? destinationIds.get(destinationSlug) : undefined,
        },
      },
      true,
    );
  }

  // 6 journal-article stubs from the §13.7 backlog: titles reserved as drafts,
  // bodies pending the sourced editorial pass (§13.7 rule 1).
  for (let i = 0; i < ARTICLE_STUBS.length; i += 1) {
    await upsertBySlug(
      payload,
      'articles',
      `sample-article-${String(i + 1).padStart(2, '0')}`,
      {
        title: ARTICLE_STUBS[i],
        _status: 'draft',
        excerpt: 'PLACEHOLDER — pending the §13.7 sourced editorial pass.',
      },
      true,
    );
  }
}

function descriptionInput(blueprint: ListingBlueprint): DescriptionInput {
  const destination = SAMPLE_DESTINATION_BY_SLUG.get(blueprint.destinationSlug);
  return {
    index: blueprint.index,
    propertyType: blueprint.propertyType,
    locality: blueprint.locality,
    destinationName: destination?.name ?? blueprint.destinationSlug,
    waterBodyName: destination?.waterBody.name ?? blueprint.waterBodySlug,
    primaryAccess: blueprint.waterAccessType[0] as string,
    beachType: blueprint.beachType,
    bedrooms: blueprint.bedrooms,
    bathrooms: blueprint.bathrooms,
    builtAreaSqm: blueprint.builtAreaSqm,
    plotAreaSqm: blueprint.plotAreaSqm,
    terraceAreaSqm: blueprint.terraceAreaSqm,
    waterFrontageM: blueprint.waterFrontageM,
    maxBoatLoaM: blueprint.maxBoatLoaM,
    waterDepthAtBerthM: blueprint.waterDepthAtBerthM,
    nearestMarinaName: blueprint.nearestMarinaName,
    nearestMarinaDistanceKm: blueprint.nearestMarinaDistanceKm,
    approxPriceEur: blueprint.approxPriceEur,
  };
}

// Interim vocabulary bridge until the Prompt 12 Lawrence generator lands:
// the inherited blueprints use the sister portal's enums.
const LAWRENCE_PROPERTY_TYPE: Record<string, string> = {
  farmhouse: 'estate',
  lighthouse: 'villa',
  boathouse: 'villa',
  land_plot: 'development_site',
  marina_residence: 'apartment',
  development_project: 'development_site',
};

const LAWRENCE_FEATURE: Record<string, string | null> = {
  infinity_pool: 'pool',
  heated_pool: 'pool',
  sauna: 'spa',
  elevator: null,
  gated: 'gatehouse',
  guest_house: 'guest_houses',
  garage: 'car_gallery',
};

function mapFeatures(features: string[]): string[] {
  const mapped = features
    .map((f) => (f in LAWRENCE_FEATURE ? LAWRENCE_FEATURE[f] : f))
    .filter((f): f is string => Boolean(f));
  return [...new Set(mapped)];
}

async function attachGallery(
  payload: Payload,
  propertyId: number,
  agencyId: number,
  altBase: string,
  photos: SourcedPhoto[],
): Promise<number[]> {
  const mediaIds: number[] = [];
  for (const photo of photos) {
    const existing = await payload.find({
      collection: 'media',
      where: { sourceId: { equals: photo.sourceId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (existing.docs[0]) {
      mediaIds.push(existing.docs[0].id);
      continue;
    }
    try {
      const res = await fetch(photo.url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      const created = await payload.create({
        collection: 'media',
        overrideAccess: true,
        file: {
          data: buffer,
          name: `sample-${photo.sourceId}.jpg`,
          mimetype: 'image/jpeg',
          size: buffer.length,
        },
        data: {
          alt: `${altBase} — ${photo.role}`,
          agency: agencyId,
          credit: `${photo.credit} / Unsplash`,
          licence: 'unsplash',
          sourceUrl: photo.sourceUrl,
          sourceId: photo.sourceId,
        },
      });
      mediaIds.push(created.id);
    } catch (err) {
      console.warn(`[seed] image ${photo.sourceId} failed:`, err);
    }
  }
  void propertyId;
  return mediaIds;
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const payload = await getPayloadClient();

  if (flags.wipe) {
    console.log('— wiping existing sample data first —');
    await purgeSamples(payload);
  }

  const { destinationIds } = await seedReferenceData(payload);
  const { agencyIds, agentIdsByAgency } = await seedAgencies(payload);
  await seedEditorialStubs(payload, destinationIds);

  let blueprints = buildAllBlueprints(60);
  if (flags.destination) {
    blueprints = blueprints.filter((b) => b.destinationSlug === flags.destination);
  }
  blueprints = blueprints.slice(0, flags.count);

  const usedImageIds = new Set<string>();
  const usedImageHashes = new Set<string>();
  let created = 0;
  let updated = 0;

  for (const blueprint of blueprints) {
    const agency = SAMPLE_AGENCIES.find((a) =>
      a.destinationSlugs.includes(blueprint.destinationSlug),
    ) as (typeof SAMPLE_AGENCIES)[number];
    const agencyId = agencyIds.get(agency.slug) as number;
    const agents = agentIdsByAgency.get(agency.slug) ?? [];
    const agentId = agents[blueprint.index % Math.max(agents.length, 1)];

    const input = descriptionInput(blueprint);
    const titleEn = composeTitle(input, DESCRIPTION_TEMPLATES.en!);

    const baseData: Record<string, unknown> = {
      title: titleEn,
      reference: blueprint.reference,
      agency: agencyId,
      agent: agentId,
      isSample: true,
      featured: blueprint.featured,
      status: blueprint.status === 'in_market' ? 'available' : blueprint.status,
      moderation: 'approved',
      channel: 'public',
      publication: 'published_openly',
      priceDisclosure: 'exact',
      sourceType: 'manual',
      propertyType: LAWRENCE_PROPERTY_TYPE[blueprint.propertyType] ?? blueprint.propertyType,
      priceType: 'fixed',
      // Interim scaling until the Prompt 12 Lawrence generator lands: the
      // inherited demo economics sit below the €20M admission floor.
      priceAmount: Math.round(
        blueprint.priceAmount * Math.max(4, Math.ceil(22_000_000 / blueprint.approxPriceEur)),
      ),
      currency: blueprint.currency,
      tenure: blueprint.tenure === 'freehold' || blueprint.tenure === 'leasehold' ? blueprint.tenure : 'freehold',
      bedrooms: blueprint.bedrooms,
      bathrooms: blueprint.bathrooms,
      builtAreaSqm: blueprint.builtAreaSqm,
      plotAreaSqm: blueprint.plotAreaSqm || undefined,
      terraceAreaSqm: blueprint.terraceAreaSqm,
      yearBuilt: blueprint.yearBuilt,
      condition: blueprint.condition,
      features: mapFeatures(blueprint.features),
      waterfront: {
        waterAccess: true,
        waterBodyType: blueprint.waterBodyType === 'marina_basin' ? 'sea' : blueprint.waterBodyType,
        waterFrontageM: blueprint.waterFrontageM ?? undefined,
        mooringType:
          blueprint.mooringType === 'dry_dock' ? 'boat_lift' : (blueprint.mooringType ?? undefined),
        maxBoatLoaM: blueprint.maxBoatLoaM ?? undefined,
        berthCount: blueprint.berthCount ?? undefined,
      },
      description: textToLexical(composeDescription(input, DESCRIPTION_TEMPLATES.en!)),
      location: {
        locality: blueprint.locality,
        region: SAMPLE_DESTINATION_BY_SLUG.get(blueprint.destinationSlug)?.region,
        country: SAMPLE_DESTINATION_BY_SLUG.get(blueprint.destinationSlug)?.country,
        coordinates: blueprint.coordinates,
        coordinatePrecision: blueprint.coordinatePrecision,
        destination: destinationIds.get(blueprint.destinationSlug),
      },
      _status: 'published',
    };

    const existing = await payload.find({
      collection: 'properties',
      where: { reference: { equals: blueprint.reference } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    let propertyId: number;
    if (existing.docs[0]) {
      propertyId = (
        await payload.update({
          collection: 'properties',
          id: existing.docs[0].id,
          data: baseData as never,
          overrideAccess: true,
        })
      ).id;
      updated += 1;
    } else {
      propertyId = (
        await payload.create({ collection: 'properties', data: baseData as never, overrideAccess: true })
      ).id;
      created += 1;
    }

    // Localised title + description for the other five locales (§13.8).
    for (const locale of LOCALES.slice(1)) {
      const templates = DESCRIPTION_TEMPLATES[locale];
      if (!templates) continue;
      await payload.update({
        collection: 'properties',
        id: propertyId,
        locale,
        overrideAccess: true,
        data: {
          title: composeTitle(input, templates),
          description: textToLexical(composeDescription(input, templates)),
        } as never,
      });
    }

    // Gallery (§13.2): skip when already populated — that is what makes
    // re-runs image-idempotent even with live Unsplash sourcing.
    const withMedia = await payload.findByID({
      collection: 'properties',
      id: propertyId,
      depth: 0,
      overrideAccess: true,
    });
    if ((withMedia.media?.length ?? 0) < 8) {
      const photos = await sourceGallery(
        blueprint.index,
        blueprint.destinationSlug as DestinationQueryKey,
        usedImageIds,
        usedImageHashes,
      );
      if (photos.length > 0) {
        const mediaIds = await attachGallery(payload, propertyId, agencyId, titleEn, photos);
        if (mediaIds.length > 0) {
          await payload.update({
            collection: 'properties',
            id: propertyId,
            data: { media: mediaIds } as never,
            overrideAccess: true,
          });
        }
      }
    }

    console.log(`  ✓ ${blueprint.reference} ${titleEn}`);
  }

  console.log(
    `\nSeed complete: ${created} created, ${updated} updated across ${blueprints.length} listings; ` +
      `${SAMPLE_AGENCIES.length} agencies, ${SAMPLE_AGENTS.length} agents, 10 landing drafts, ${ARTICLE_STUBS.length} article stubs.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
