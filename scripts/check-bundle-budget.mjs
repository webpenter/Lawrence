import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

/**
 * Budgets from spec §12.1 and CLAUDE.md rule 1 (mobile, Moto G class, throttled 4G):
 * - Home first-load JS: < 110 KB gz (fail > 150 KB)
 * - Search first-load JS: < 160 KB gz (fail > 200 KB)
 * - Listing first-load JS: < 130 KB gz (fail > 170 KB)
 */
export const BUDGETS_KB = {
  '/(frontend)/[locale]/page': { label: 'home', budget: 110 },
  '/(frontend)/[locale]/search/page': { label: 'search', budget: 160 },
  '/(frontend)/[locale]/property/[slug]/page': { label: 'listing', budget: 130 },
};

export const SHARED_LAYOUT = '/(frontend)/[locale]/layout';

export function getManifest(manifestPath = '.next/app-build-manifest.json') {
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest ${manifestPath} does not exist. Run build first.`);
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

export function gzKbForRoute(manifest, routeKeys, baseDir = '.next') {
  const files = [
    ...new Set(routeKeys.flatMap((key) => manifest.pages[key] ?? [])),
  ].filter((f) => f.endsWith('.js'));
  if (files.length === 0) return null;
  let bytes = 0;
  for (const f of files) {
    const fullPath = `${baseDir}/${f}`;
    if (!existsSync(fullPath)) {
      throw new Error(
        `Chunk ${f} missing on disk: ${baseDir} is not a clean production build. Run without BUDGET_SKIP_BUILD.`,
      );
    }
    bytes += gzipSync(readFileSync(fullPath), { level: 9 }).length;
  }
  return bytes / 1024;
}

export function getTopChunkOffenders(manifest, baseDir = '.next', limit = 5) {
  const files = new Set();
  for (const pageFiles of Object.values(manifest.pages)) {
    for (const f of pageFiles) {
      if (f.endsWith('.js')) files.add(f);
    }
  }

  const chunks = [];
  for (const f of files) {
    const fullPath = `${baseDir}/${f}`;
    if (existsSync(fullPath)) {
      const raw = readFileSync(fullPath);
      const gz = gzipSync(raw, { level: 9 }).length;
      chunks.push({
        file: f,
        rawKb: raw.length / 1024,
        gzKb: gz / 1024,
      });
    }
  }

  chunks.sort((a, b) => b.gzKb - a.gzKb);
  return chunks.slice(0, limit);
}

export function checkBudgets(options = {}) {
  const {
    manifestPath = '.next/app-build-manifest.json',
    baseDir = '.next',
    simulateOverheadKb = 0,
    targetRoute = '/(frontend)/[locale]/page',
  } = options;

  const manifest = getManifest(manifestPath);
  const results = [];
  let passed = true;

  for (const [route, { label, budget }] of Object.entries(BUDGETS_KB)) {
    let size = gzKbForRoute(manifest, [route, SHARED_LAYOUT], baseDir);
    if (size === null) {
      results.push({ label, route, size: null, budget, ok: true, headroom: null });
      continue;
    }

    if (simulateOverheadKb > 0 && route === targetRoute) {
      size += simulateOverheadKb;
    }

    const ok = size <= budget;
    if (!ok) passed = false;

    results.push({
      label,
      route,
      size,
      budget,
      headroom: budget - size,
      ok,
    });
  }

  const offenders = getTopChunkOffenders(manifest, baseDir, 5);

  return { passed, results, offenders };
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const simulateFlag = process.argv.includes('--simulate-50kb');
  const simulateOverhead = simulateFlag
    ? 50
    : Number(process.env.SIMULATE_OVERHEAD_KB || 0);

  if (!existsSync('.next/app-build-manifest.json') || process.env.BUDGET_SKIP_BUILD !== '1') {
    execSync('pnpm build', {
      stdio: 'inherit',
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    });
  }

  if (simulateOverhead > 0) {
    console.log(`\n⚠️  Simulating +${simulateOverhead} kB overhead on home route (acceptance test)...`);
  }

  const { passed, results, offenders } = checkBudgets({
    simulateOverheadKb: simulateOverhead,
  });

  console.log('\n========================================================================');
  console.log('LAWRENCE — §10.2 Performance Budgets (First-Load JS Gzipped)');
  console.log('========================================================================');
  console.log(
    'Route'.padEnd(12) +
      'Size (kB gz)'.padEnd(16) +
      'Budget (kB)'.padEnd(14) +
      'Headroom (kB)'.padEnd(16) +
      'Status',
  );
  console.log('------------------------------------------------------------------------');

  for (const r of results) {
    if (r.size === null) {
      console.log(`${r.label.padEnd(12)}SKIPPED (not built)`);
      continue;
    }
    const status = r.ok ? '✓ PASS' : '✗ OVER BUDGET';
    console.log(
      r.label.padEnd(12) +
        `${r.size.toFixed(1)} kB`.padEnd(16) +
        `${r.budget} kB`.padEnd(14) +
        `${r.headroom > 0 ? '+' : ''}${r.headroom.toFixed(1)} kB`.padEnd(16) +
        status,
    );
  }
  console.log('========================================================================');

  console.log('\nTop 5 Client Chunk Offenders:');
  offenders.forEach((c, idx) => {
    console.log(
      `  ${idx + 1}. ${c.file.padEnd(45)} ${c.gzKb.toFixed(1)} kB gz (${c.rawKb.toFixed(1)} kB raw)`,
    );
  });
  console.log('========================================================================\n');

  if (!passed) {
    console.error('❌ One or more routes exceeded their gzipped first-load JS budget.');
    process.exit(1);
  }

  console.log('✅ All budgeted routes are within their gzipped JS budget.');
}
