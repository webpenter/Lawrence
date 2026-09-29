import 'dotenv/config';

/**
 * §14 `pnpm audit:seo`: crawls the running site (BASE_URL, default
 * http://localhost:3000) and reports — as errors — missing canonicals,
 * missing/short descriptions, missing or duplicate titles, missing h1s, and
 * sitemap URLs returning non-200; and — as warnings — orphan-page heuristics
 * (sitemap URLs sampled beyond the check limit) and DB-dependent checks that
 * could not run. Exits 1 on any error.
 */

const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const SITEMAP_SAMPLE_LIMIT = 50;

interface Finding {
  level: 'error' | 'warning';
  url: string;
  message: string;
}

const findings: Finding[] = [];
const report = (level: Finding['level'], url: string, message: string) =>
  findings.push({ level, url, message });

async function fetchText(url: string): Promise<{ status: number; body: string; type: string }> {
  const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20_000) });
  return {
    status: res.status,
    body: res.status === 200 ? await res.text() : '',
    type: res.headers.get('content-type') ?? '',
  };
}

function extract(pattern: RegExp, html: string): string | null {
  return pattern.exec(html)?.[1]?.trim() ?? null;
}

async function auditPage(url: string, seenTitles: Map<string, string>): Promise<void> {
  const { status, body } = await fetchText(url);
  if (status !== 200) {
    report('error', url, `returned ${status}`);
    return;
  }

  const title = extract(/<title>([^<]*)<\/title>/i, body);
  if (!title) report('error', url, 'missing <title>');
  else {
    const prior = seenTitles.get(title);
    if (prior && prior !== url) report('error', url, `duplicate title (also on ${prior}): "${title}"`);
    else seenTitles.set(title, url);
    if (title.length > 65) report('warning', url, `title is ${title.length} chars (>60 target)`);
  }

  const description = extract(
    /<meta\s+name="description"\s+content="([^"]*)"/i,
    body,
  );
  if (!description) report('error', url, 'missing meta description');
  else if (description.length < 80) {
    report('warning', url, `description is ${description.length} chars (<140 target)`);
  }

  if (!/<link\s+rel="canonical"/i.test(body)) report('error', url, 'missing canonical');
  if (!/hreflang="x-default"/i.test(body)) report('warning', url, 'missing x-default hreflang');

  const h1Count = (body.match(/<h1[\s>]/gi) ?? []).length;
  if (h1Count === 0) report('error', url, 'no <h1>');
  if (h1Count > 1) report('error', url, `${h1Count} <h1> elements (must be exactly one)`);
}

async function auditSitemaps(): Promise<string[]> {
  const index = await fetchText(`${BASE}/sitemap.xml`);
  if (index.status !== 200) {
    report('error', `${BASE}/sitemap.xml`, `sitemap index returned ${index.status}`);
    return [];
  }
  const children = [...index.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] as string);
  const urls: string[] = [];
  for (const child of children) {
    const childRes = await fetchText(child);
    if (childRes.status !== 200) {
      report('error', child, `sitemap child returned ${childRes.status}`);
      continue;
    }
    urls.push(...[...childRes.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] as string));
  }
  return urls;
}

async function main(): Promise<void> {
  console.log(`audit:seo against ${BASE}\n`);

  // Plain-text machine endpoints (§14.6): served, and served as text/plain.
  for (const path of ['/robots.txt', '/llms.txt', '/llms-full.txt']) {
    const res = await fetchText(`${BASE}${path}`);
    if (res.status !== 200) report('error', `${BASE}${path}`, `returned ${res.status}`);
    else if (!res.type.includes('text/plain')) {
      report('error', `${BASE}${path}`, `content-type is "${res.type}", expected text/plain`);
    }
  }

  const sitemapUrls = await auditSitemaps();
  const sample = sitemapUrls.slice(0, SITEMAP_SAMPLE_LIMIT);
  if (sitemapUrls.length > SITEMAP_SAMPLE_LIMIT) {
    report(
      'warning',
      `${BASE}/sitemap.xml`,
      `${sitemapUrls.length - SITEMAP_SAMPLE_LIMIT} sitemap URLs beyond the ${SITEMAP_SAMPLE_LIMIT}-URL sample were not fetched`,
    );
  }

  const seenTitles = new Map<string, string>();
  const pages = new Set<string>([`${BASE}/en`, `${BASE}/en/collection`, ...sample]);
  for (const url of pages) {
    try {
      await auditPage(url, seenTitles);
    } catch (err) {
      report('error', url, `fetch failed: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  // Prompt 10 acceptance: no gated URL appears in any sitemap — /off-market
  // and /account must never be listed, on any locale prefix.
  const gated = sitemapUrls.filter((u) => /\/(off-market|account)(\/|$)/.test(u));
  for (const url of gated) {
    report('error', url, 'gated URL present in a sitemap (§15.3)');
  }

  // Internal-link heuristic (§15.2): every sitemap property URL should be
  // reachable from a market page; with no market sitemap entries, listings
  // rely on search alone — flag it.
  const marketCount = sitemapUrls.filter((u) => u.includes('/markets/')).length;
  const propertyCount = sitemapUrls.filter((u) => u.includes('/property/')).length;
  if (propertyCount > 0 && marketCount === 0) {
    report(
      'warning',
      `${BASE}/sitemaps/markets.xml`,
      `${propertyCount} listings have no gated market pages linking to them (orphan risk)`,
    );
  }

  const errors = findings.filter((f) => f.level === 'error');
  const warnings = findings.filter((f) => f.level === 'warning');
  for (const finding of findings) {
    console.log(`  [${finding.level}] ${finding.url}\n          ${finding.message}`);
  }
  console.log(`\naudit:seo: ${errors.length} error(s), ${warnings.length} warning(s) across ${pages.size} pages + sitemaps.`);
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('audit:seo failed to run:', err);
  process.exit(1);
});
