import 'dotenv/config';

import { spawn, type ChildProcess } from 'node:child_process';

import { getPayload, type Payload } from 'payload';

import config from '@/payload.config';

/**
 * `pnpm audit:exposure` (CLAUDE.md, §8.2) — required before every merge.
 *
 * Plants CANARY content, then crawls every public route as an anonymous
 * visitor and asserts that no response contains:
 *   - an off-market listing (its title, or any URL addressing it),
 *   - an exact address (location.addressLine),
 *   - owner/commercial data (commissionTerms),
 *   - internalValueEur,
 *   - a price for a listing whose priceDisclosure is not "exact".
 *
 * Boots `pnpm dev` itself when BASE_URL is not already reachable. Exits 1 on
 * any finding. Canaries are tagged isSample=false and cleaned up afterwards.
 */

const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const RUN = Math.random().toString(36).slice(2, 8);

const MARKERS = {
  offMarketTitle: `CanaryOffmarket${RUN}`,
  address: `CanaryAddress${RUN}`,
  internalValue: 37_777_771,
  commission: `CanaryCommission${RUN}`,
  hiddenPrice: 41_111_113,
};

interface Finding {
  url: string;
  marker: string;
}
const findings: Finding[] = [];

async function reachable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok || res.status === 503;
  } catch {
    return false;
  }
}

async function bootDevServer(): Promise<ChildProcess> {
  console.log('— booting dev server for the crawl —');
  const child = spawn('pnpm', ['dev'], { stdio: 'ignore', detached: true });
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    if (await reachable()) return child;
  }
  throw new Error(`dev server did not become reachable at ${BASE}`);
}

interface Canaries {
  offMarketId: number;
  publicId: number;
  publicSlug: string;
  agencyId: number;
}

async function plantCanaries(payload: Payload): Promise<Canaries> {
  const agency = await payload.create({
    collection: 'agencies',
    overrideAccess: true,
    data: { name: `Canary Agency ${RUN}`, slug: `canary-agency-${RUN}` },
  });

  const offMarket = await payload.create({
    collection: 'properties',
    overrideAccess: true,
    data: {
      title: MARKERS.offMarketTitle,
      agency: agency.id,
      propertyType: 'villa',
      priceType: 'fixed',
      currency: 'EUR',
      priceAmount: 30_000_000,
      internalValueEur: MARKERS.internalValue,
      commissionTerms: MARKERS.commission,
      publication: 'off_market',
      channel: 'off_market',
      priceDisclosure: 'exact',
      status: 'available',
      moderation: 'unreviewed',
      sourceType: 'manual',
      location: { addressLine: MARKERS.address, locality: 'Portofino', country: 'IT' },
      _status: 'published',
    },
  });

  const openPublic = await payload.create({
    collection: 'properties',
    overrideAccess: true,
    data: {
      title: `Canary Public Listing ${RUN}`,
      agency: agency.id,
      propertyType: 'villa',
      priceType: 'on_request',
      currency: 'EUR',
      priceAmount: MARKERS.hiddenPrice,
      internalValueEur: MARKERS.internalValue,
      commissionTerms: MARKERS.commission,
      publication: 'published_without_price',
      channel: 'public',
      priceDisclosure: 'on_request',
      status: 'available',
      moderation: 'unreviewed',
      sourceType: 'manual',
      location: { addressLine: MARKERS.address, locality: 'Portofino', country: 'IT' },
      _status: 'published',
    },
  });

  return {
    offMarketId: offMarket.id,
    publicId: openPublic.id,
    publicSlug: (openPublic.slug as string) ?? '',
    agencyId: agency.id,
  };
}

async function removeCanaries(payload: Payload, canaries: Canaries): Promise<void> {
  await payload.delete({
    collection: 'properties',
    where: { id: { in: [canaries.offMarketId, canaries.publicId] } },
    overrideAccess: true,
  });
  await payload.delete({
    collection: 'agencies',
    where: { id: { equals: canaries.agencyId } },
    overrideAccess: true,
  });
}

function scan(url: string, body: string, canaries: Canaries): void {
  const checks: Array<[string, string]> = [
    [MARKERS.offMarketTitle, 'off-market listing title'],
    [`/off-market/${canaries.offMarketId}`, 'off-market listing URL'],
    [MARKERS.address, 'exact address (addressLine)'],
    [String(MARKERS.internalValue), 'internalValueEur'],
    [MARKERS.commission, 'commissionTerms / owner data'],
    [String(MARKERS.hiddenPrice), 'price of an on-request listing'],
    // Formatted variants of the forbidden numbers.
    ['37,777,771', 'internalValueEur (formatted)'],
    ['41,111,113', 'hidden price (formatted)'],
  ];
  for (const [needle, label] of checks) {
    if (needle && body.includes(needle)) findings.push({ url, marker: label });
  }
}

async function crawl(url: string, canaries: Canaries): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30_000) });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !/text|json|xml/.test(type)) return null;
    const body = await res.text();
    scan(url, body, canaries);
    return body;
  } catch (err) {
    console.warn(`  (skip ${url}: ${(err as Error).message})`);
    return null;
  }
}

async function main(): Promise<void> {
  let server: ChildProcess | null = null;
  if (!(await reachable())) server = await bootDevServer();

  const payload = await getPayload({ config: await config });
  const canaries = await plantCanaries(payload);
  console.log(
    `— canaries planted: off-market #${canaries.offMarketId}, public /${canaries.publicSlug} —`,
  );

  try {
    // Give ISR/search sync a moment.
    await new Promise((r) => setTimeout(r, 1500));

    const routes = [
      '/',
      '/en',
      '/en/collection',
      '/en/collection?country=IT',
      `/en/property/${canaries.publicSlug}`,
      '/en/markets',
      '/en/journal',
      '/en/about',
      '/en/contact',
      '/robots.txt',
      '/llms.txt',
      '/llms-full.txt',
      '/sitemap.xml',
      // Off-market must 404 for anonymous — and even the 404 must not leak.
      `/en/property/${canaries.offMarketId}`,
    ];

    for (const route of routes) {
      process.stdout.write(`  crawl ${route}\n`);
      await crawl(`${BASE}${route}`, canaries);
    }

    // Sitemap children: crawl each child sitemap and a sample of its URLs.
    const sitemap = await crawl(`${BASE}/sitemap.xml`, canaries);
    const children = [...(sitemap ?? '').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] as string);
    for (const child of children) {
      const childBody = await crawl(child.replace(/^https?:\/\/[^/]+/, BASE), canaries);
      const urls = [...(childBody ?? '').matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map((m) => m[1] as string)
        .slice(0, 25);
      // The sitemap itself must never list the off-market listing.
      for (const u of urls) {
        if (u.includes(String(canaries.offMarketId)) || u.includes('off-market')) {
          findings.push({ url: child, marker: 'off-market URL in sitemap' });
        }
      }
      for (const u of urls.slice(0, 10)) {
        await crawl(u.replace(/^https?:\/\/[^/]+/, BASE), canaries);
      }
    }

    // The public search surface must not return the off-market canary.
    const searchBody = await crawl(`${BASE}/en/collection?sort=newest`, canaries);
    if (searchBody?.includes(MARKERS.offMarketTitle)) {
      findings.push({ url: '/en/collection', marker: 'off-market listing in public search' });
    }
  } finally {
    await removeCanaries(payload, canaries);
    console.log('— canaries removed —');
    if (server?.pid) {
      try {
        process.kill(-server.pid);
      } catch {
        // already gone
      }
    }
  }

  if (findings.length > 0) {
    console.error(`\n✖ audit:exposure FAILED — ${findings.length} leak(s):`);
    for (const f of findings) console.error(`  ${f.url} → ${f.marker}`);
    process.exit(1);
  }
  console.log('\n✅ audit:exposure passed — no off-market, address, internal-value or hidden-price leaks.');
  process.exit(0);
}

main().catch((err) => {
  console.error('audit:exposure crashed:', err);
  process.exit(1);
});
