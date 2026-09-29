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
import { SAMPLE_DESTINATIONS, SAMPLE_DESTINATION_BY_SLUG } from '@/lib/sample/markets';
import { buildAllBlueprints, type ListingBlueprint } from '@/lib/sample/economics';
import { sourceGallery, type SourcedPhoto } from '@/lib/sample/unsplash';
import { purgeSamples } from '@/scripts/purge-samples';
import { SAMPLE_ARTICLES } from '@/scripts/seed-data/articles';
import type { DestinationQueryKey } from '@/scripts/image-queries';
import {
  marketEditorialFor,
  REPORT_SEEDS,
  SEGMENT_PAGE_SEEDS,
} from '@/scripts/seed-data/market-editorial';

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

function parseFlags(argv: string[]): { count: number; destination?: string; wipe: boolean } {
  const flags = { count: 45, destination: undefined as string | undefined, wipe: false };
  for (const arg of argv) {
    if (arg === '--wipe') flags.wipe = true;
    else if (arg.startsWith('--count=')) flags.count = Number(arg.slice(8)) || 45;
    else if (arg.startsWith('--market=')) flags.destination = arg.slice(9);
    else if (arg.startsWith('--destination=')) flags.destination = arg.slice(14);
  }
  return flags;
}

async function upsertBySlug(
  payload: Payload,
  collection: 'markets' | 'agencies' | 'articles' | 'reports',
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
  marketIds: Map<string, number>;
}> {
  const marketIds = new Map<string, number>();

  for (const destination of SAMPLE_DESTINATIONS) {
    // §13.10: sample markets carry full derived editorial + sourced stats so
    // the §5.5 gate, the stats API and the SEO surfaces exercise for real —
    // isSample keeps all of it noindexed and out of sitemaps (rule 8).
    const editorial = marketEditorialFor(destination);
    marketIds.set(
      destination.slug,
      await upsertBySlug(payload, 'markets', destination.slug, {
        name: destination.name,
        country: destination.country,
        region: destination.region,
        isSample: true,
        answer: editorial.answer,
        intro: textToLexical(...editorial.introParagraphs),
        buyingNotes: textToLexical(...editorial.buyingNotesParagraphs),
        faq: editorial.faq,
        stats: editorial.stats,
        metaDescription: editorial.metaDescription,
      }),
    );
  }

  // Second pass: related markets (same country first, then neighbours by list order).
  for (const destination of SAMPLE_DESTINATIONS) {
    const related = SAMPLE_DESTINATIONS.filter((other) => other.slug !== destination.slug)
      .sort((a, b) =>
        Number(b.country === destination.country) - Number(a.country === destination.country),
      )
      .slice(0, 4)
      .map((other) => marketIds.get(other.slug))
      .filter((id): id is number => id != null);
    await payload.update({
      collection: 'markets',
      id: marketIds.get(destination.slug) as number,
      data: { relatedMarkets: related },
      overrideAccess: true,
    });
  }
  return { marketIds };
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
  marketIds: Map<string, number>,
): Promise<void> {
  // §5.5 market × segment pages: published sample editorial per combination.
  for (const seed of SEGMENT_PAGE_SEEDS) {
    const marketId = marketIds.get(seed.marketSlug);
    if (marketId == null) continue;
    const data = {
      title: seed.title,
      market: marketId,
      segment: seed.segment,
      isSample: true,
      intro: textToLexical(...seed.introParagraphs),
      faq: seed.faq,
      _status: 'published',
    };
    const existing = await payload.find({
      collection: 'segment-pages',
      where: { and: [{ market: { equals: marketId } }, { segment: { equals: seed.segment } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (existing.docs[0]) {
      await payload.update({
        collection: 'segment-pages',
        id: existing.docs[0].id,
        data: data as never,
        overrideAccess: true,
      });
    } else {
      await payload.create({ collection: 'segment-pages', data: data as never, overrideAccess: true });
    }
  }

  // §15.4 launch reports: published sample summaries; the gated PDF arrives
  // with the real editorial pass.
  for (const seed of REPORT_SEEDS) {
    await upsertBySlug(payload, 'reports', seed.slug, {
      title: seed.title,
      summary: textToLexical(...seed.summaryParagraphs),
      publicationDate: seed.publicationDate,
      isSample: true,
      metaDescription: seed.metaDescription,
      markets: seed.marketSlugs
        .map((slug) => marketIds.get(slug))
        .filter((id): id is number => id != null),
      authors: [{ name: 'Lawrence Research Desk' }],
      _status: 'published',
    });
  }

  // §13.10: eight sample journal articles from the §13.7 backlog, published
  // as demonstration content (isSample: SAMPLE notice, noindex, no sitemap).
  for (let i = 0; i < SAMPLE_ARTICLES.length; i += 1) {
    const article = SAMPLE_ARTICLES[i]!;
    await upsertBySlug(payload, 'articles', article.slug, {
      title: article.title,
      excerpt: article.excerpt,
      body: textToLexical(...article.paragraphs),
      publishedAt: new Date(Date.UTC(2026, 0, 5 + i * 9, 9)).toISOString(),
      isSample: true,
      _status: 'published',
    });
  }
}

function descriptionInput(blueprint: ListingBlueprint): DescriptionInput {
  const destination = SAMPLE_DESTINATION_BY_SLUG.get(blueprint.destinationSlug);
  return {
    index: blueprint.index,
    propertyType: blueprint.propertyType,
    locality: blueprint.locality,
    destinationName: destination?.name ?? blueprint.destinationSlug,
    waterBodyName: destination?.waterBody?.name ?? '',
    primaryAccess: blueprint.waterFrontageM != null ? 'direct_shore' : '',
    beachType: 'sand',
    bedrooms: blueprint.bedrooms,
    bathrooms: blueprint.bathrooms,
    builtAreaSqm: blueprint.builtAreaSqm,
    plotAreaSqm: blueprint.plotAreaSqm,
    terraceAreaSqm: blueprint.terraceAreaSqm,
    waterFrontageM: blueprint.waterFrontageM,
    maxBoatLoaM: blueprint.maxBoatLoaM,
    waterDepthAtBerthM:
      blueprint.maxBoatLoaM != null
        ? Math.round((1.8 + blueprint.maxBoatLoaM / 12) * 10) / 10
        : null,
    nearestMarinaName: `${blueprint.locality} Marina`,
    nearestMarinaDistanceKm: 1 + (blueprint.index % 5),
    approxPriceEur: blueprint.approxPriceEur,
  };
}

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
          visibility: 'public',
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

/**
 * §13.10: 8 test members across the states — active, pending and suspended,
 * with and without requirements. Credentials are dev-only (§13.12: sample
 * members never receive real email — the addresses cannot deliver).
 */
const MEMBER_STATES: Array<{ status: 'active' | 'pending' | 'suspended'; verified: boolean }> = [
  { status: 'active', verified: true },
  { status: 'active', verified: true },
  { status: 'active', verified: true },
  { status: 'active', verified: true },
  { status: 'active', verified: true },
  { status: 'active', verified: true },
  { status: 'pending', verified: false },
  { status: 'suspended', verified: true },
];

async function seedMembers(payload: Payload): Promise<Map<number, number>> {
  const memberIds = new Map<number, number>();
  for (let index = 1; index <= 8; index += 1) {
    const email = `member${String(index).padStart(2, '0')}@sample.lawrence`;
    const state = MEMBER_STATES[index - 1]!;
    const existing = await payload.find({
      collection: 'members',
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.docs[0]) {
      memberIds.set(index, existing.docs[0].id);
      continue;
    }
    const created = await payload.create({
      collection: 'members',
      overrideAccess: true,
      data: {
        email,
        password: 'sample-member-password',
        name: `Sample Member ${index}`,
        status: state.status,
        marketingConsent: index % 2 === 0,
        _verified: state.verified,
      },
    });
    memberIds.set(index, created.id);
  }
  return memberIds;
}

/**
 * §13.10: 12 saved listings, active requirements for three members, and a
 * populated MemberActivity trail so the dashboards are not empty. Idempotent:
 * existing rows are counted, not duplicated.
 */
async function seedMemberEngagement(
  payload: Payload,
  memberIds: Map<number, number>,
  marketIds: Map<string, number>,
  propertyIds: Map<string, number>,
): Promise<void> {
  const properties = [...propertyIds.entries()];
  const offMarket = buildAllBlueprints()
    .filter((b) => b.publication === 'off_market')
    .map((b) => propertyIds.get(b.reference))
    .filter((id): id is number => id != null);

  // Requirements: members 1–3 (member 4+ demonstrates "without requirements").
  const requirementSeeds = [
    { member: 1, min: 20, max: 45, markets: ['saint-tropez', 'cap-ferrat'], types: ['villa', 'estate'] },
    { member: 2, min: 30, max: 90, markets: ['lake-como', 'tuscany'], types: ['palazzo', 'estate'] },
    { member: 3, min: 20, max: 60, markets: ['gstaad', 'courchevel', 'aspen'], types: ['chalet'] },
  ];
  for (const seed of requirementSeeds) {
    const memberId = memberIds.get(seed.member);
    if (memberId == null) continue;
    const existing = await payload.find({
      collection: 'requirements',
      where: { and: [{ member: { equals: memberId } }, { status: { equals: 'active' } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (existing.docs[0]) continue;
    await payload.create({
      collection: 'requirements',
      overrideAccess: true,
      data: {
        member: memberId,
        status: 'active',
        budgetMinEur: seed.min * 1_000_000,
        budgetMaxEur: seed.max * 1_000_000,
        markets: seed.markets
          .map((slug) => marketIds.get(slug))
          .filter((id): id is number => id != null),
        propertyTypes: seed.types,
        notifyByEmail: seed.member !== 3,
      } as never,
    });
  }

  // 12 saved listings across members 1–4 (§13.10).
  for (let i = 0; i < 12; i += 1) {
    const memberId = memberIds.get((i % 4) + 1);
    const entry = properties[(i * 3) % Math.max(properties.length, 1)];
    if (memberId == null || entry == null) continue;
    const [, propertyId] = entry;
    const existing = await payload.find({
      collection: 'saved-listings',
      where: { and: [{ member: { equals: memberId } }, { property: { equals: propertyId } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (existing.docs[0]) continue;
    await payload.create({
      collection: 'saved-listings',
      overrideAccess: true,
      data: { member: memberId, property: propertyId, savedAt: new Date(Date.UTC(2026, 8, 1 + i)).toISOString() } as never,
    });
  }

  // Activity trail: off-market views and document downloads feed the §9.2
  // demand panel. One deterministic pass; skipped entirely when present.
  const activityProbe = await payload.find({
    collection: 'member-activity',
    where: { action: { equals: 'off_market_view' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (!activityProbe.docs[0] && offMarket.length > 0) {
    for (let i = 0; i < 24; i += 1) {
      const memberId = memberIds.get((i % 6) + 1);
      const propertyId = offMarket[i % offMarket.length];
      if (memberId == null || propertyId == null) continue;
      await payload.create({
        collection: 'member-activity',
        overrideAccess: true,
        data: {
          member: memberId,
          property: propertyId,
          action: i % 4 === 3 ? 'document_download' : 'off_market_view',
          at: new Date(Date.UTC(2026, 8, 1 + (i % 26), 8 + (i % 10))).toISOString(),
        } as never,
      });
    }
  }
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const payload = await getPayloadClient();

  if (flags.wipe) {
    console.log('— wiping existing sample data first —');
    await purgeSamples(payload);
  }

  const { marketIds } = await seedReferenceData(payload);
  const { agencyIds, agentIdsByAgency } = await seedAgencies(payload);
  await seedEditorialStubs(payload, marketIds);
  const memberIds = await seedMembers(payload);

  let blueprints = buildAllBlueprints();
  if (flags.destination) {
    blueprints = blueprints.filter((b) => b.destinationSlug === flags.destination);
  }
  blueprints = blueprints.slice(0, flags.count);
  // §2.2: the prime cap is 10% of published inventory, so the four prime
  // exceptions must publish LAST — once the other 41 listings exist, the cap
  // admits exactly four.
  blueprints = [
    ...blueprints.filter((b) => !b.primeException),
    ...blueprints.filter((b) => b.primeException),
  ];

  const usedImageIds = new Set<string>();
  const usedImageHashes = new Set<string>();
  const propertyIds = new Map<string, number>();
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
    const offMarket = blueprint.publication === 'off_market';

    // §8.4: the publication decision routes channel + price disclosure.
    const priceDisclosure = offMarket
      ? 'exact'
      : blueprint.publication === 'published_openly'
        ? 'exact'
        : blueprint.publication === 'published_as_band'
          ? 'band'
          : 'on_request';
    const eurToLocal: Record<string, number> = { EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.94, AED: 3.97 };
    const rate = eurToLocal[blueprint.currency] ?? 1;

    const baseData: Record<string, unknown> = {
      title: titleEn,
      // Off-market listings have no public slug, by design (§8.6).
      slug: offMarket ? undefined : `sample-${blueprint.reference.toLowerCase()}`,
      reference: blueprint.reference,
      agency: agencyId,
      agent: agentId,
      isSample: true,
      featured: blueprint.featured,
      status: blueprint.status === 'in_market' ? 'available' : blueprint.status,
      moderation: 'approved',
      channel: offMarket ? 'off_market' : 'public',
      publication: blueprint.publication,
      priceDisclosure,
      sourceType: 'manual',
      propertyType: blueprint.propertyType,
      priceType:
        priceDisclosure === 'band'
          ? 'price_band'
          : priceDisclosure === 'on_request'
            ? 'on_request'
            : 'fixed',
      priceAmount: blueprint.priceAmount,
      priceBandMin:
        blueprint.priceBandMinEur != null
          ? Math.round(blueprint.priceBandMinEur * rate)
          : undefined,
      priceBandMax:
        blueprint.priceBandMaxEur != null
          ? Math.round(blueprint.priceBandMaxEur * rate)
          : undefined,
      // §2.2: the four prime exceptions are the explicit admin tier choice.
      valueTier: blueprint.primeException ? 'prime' : undefined,
      currency: blueprint.currency,
      tenure: ['freehold', 'leasehold', 'concession'].includes(blueprint.tenure)
        ? blueprint.tenure
        : 'freehold',
      bedrooms: blueprint.bedrooms,
      bathrooms: blueprint.bathrooms,
      receptionRooms: blueprint.receptionRooms,
      builtAreaSqm: blueprint.builtAreaSqm,
      plotAreaSqm: blueprint.plotAreaSqm || undefined,
      plotAreaHa:
        blueprint.plotAreaSqm >= 10_000
          ? Math.round(blueprint.plotAreaSqm / 100) / 100
          : undefined,
      terraceAreaSqm: blueprint.terraceAreaSqm,
      yearBuilt: blueprint.yearBuilt,
      renovatedYear: blueprint.renovatedYear ?? undefined,
      condition: blueprint.condition,
      architect: blueprint.architect ?? undefined,
      heritageStatus: blueprint.heritageStatus,
      features: mapFeatures(blueprint.features),
      waterfront: blueprint.waterBodyType
        ? {
            waterAccess: true,
            waterBodyType: blueprint.waterBodyType,
            waterFrontageM: blueprint.waterFrontageM ?? undefined,
            mooringType: blueprint.mooringType ?? undefined,
            maxBoatLoaM: blueprint.maxBoatLoaM ?? undefined,
            berthCount: blueprint.berthCount ?? undefined,
          }
        : undefined,
      provenance:
        blueprint.architect || blueprint.heritageStatus !== 'none'
          ? textToLexical(
              `${blueprint.architect ? `Designed by ${blueprint.architect} and completed` : 'Completed'} in ${blueprint.yearBuilt}, ` +
                `the house has been held by a small number of families since${blueprint.heritageStatus !== 'none' ? ' and stands under heritage protection' : ''}. ` +
                'Sample provenance text — demonstration data.',
            )
          : undefined,
      description: textToLexical(composeDescription(input, DESCRIPTION_TEMPLATES.en!)),
      location: {
        locality: blueprint.locality,
        region: SAMPLE_DESTINATION_BY_SLUG.get(blueprint.destinationSlug)?.region,
        country: SAMPLE_DESTINATION_BY_SLUG.get(blueprint.destinationSlug)?.country,
        coordinates: blueprint.coordinates,
        coordinatePrecision:
          blueprint.coordinatePrecision === 'hidden' ? 'locality_only' : blueprint.coordinatePrecision,
        market: marketIds.get(blueprint.destinationSlug),
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

    propertyIds.set(blueprint.reference, propertyId);

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

  await seedMemberEngagement(payload, memberIds, marketIds, propertyIds);

  const offMarketCount = blueprints.filter((b) => b.publication === 'off_market').length;
  console.log(
    `\nSeed complete: ${created} created, ${updated} updated across ${blueprints.length} listings ` +
      `(${blueprints.length - offMarketCount} public / ${offMarketCount} off-market); ` +
      `${memberIds.size} members; ${SAMPLE_AGENCIES.length} agencies, ${SAMPLE_AGENTS.length} agents, ` +
      `${SEGMENT_PAGE_SEEDS.length} segment pages, ${REPORT_SEEDS.length} reports, ${SAMPLE_ARTICLES.length} articles.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  console.error('detail:', JSON.stringify((err as { data?: unknown }).data ?? {}, null, 2));
  process.exit(1);
});
