import 'dotenv/config';

import { getPayloadClient } from '@/lib/db';
import { offMarketPredicate, publicPredicate } from '@/lib/db/filters';
import { fullReindex, typesenseConfigured } from '@/lib/search/client';
import { toSearchDocument } from '@/lib/search/document';
import type { SearchAudience } from '@/lib/search/schema';

// `pnpm search:reindex` — full rebuild of BOTH §7.1 collections
// (public_listings from the public predicate, member_listings from the
// off-market predicate), each into a fresh physical collection with an atomic
// alias swap. Postgres is the source of truth; run after bulk imports or to
// repair incremental-sync drift. A document only ever lands in the collection
// its channel belongs to — that separation is infrastructure, not a filter.
async function collectDocuments(
  audience: SearchAudience,
): Promise<Array<Record<string, unknown>>> {
  const payload = await getPayloadClient();
  const where = audience === 'public' ? publicPredicate() : offMarketPredicate();
  const documents: Array<Record<string, unknown>> = [];
  let page = 1;

  for (;;) {
    const res = await payload.find({
      collection: 'properties',
      where,
      limit: 200,
      page,
      depth: 1,
    });
    documents.push(...res.docs.map((doc) => toSearchDocument(doc)));
    if (!res.hasNextPage) break;
    page += 1;
  }
  return documents;
}

async function main(): Promise<void> {
  if (!typesenseConfigured()) {
    console.error('TYPESENSE_HOST / TYPESENSE_API_KEY are not set. Nothing to do.');
    process.exit(1);
  }

  for (const audience of ['public', 'member'] as const) {
    const documents = await collectDocuments(audience);
    const { collection, indexed } = await fullReindex(documents, audience);
    console.log(
      `[${audience}] indexed ${indexed} listings into ${collection}; alias swapped atomically.`,
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Reindex failed:', err);
  process.exit(1);
});
