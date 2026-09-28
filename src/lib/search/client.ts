import { Client } from 'typesense';

import type { PropertyFilters } from '@/lib/db/filters';

import {
  aliasFor,
  FACET_BY,
  filtersToTypesense,
  PROPERTY_SEARCH_SCHEMA,
  sortToTypesense,
  type SearchAudience,
} from './schema';

export function typesenseConfigured(): boolean {
  return Boolean(process.env.TYPESENSE_HOST && process.env.TYPESENSE_API_KEY);
}

export function typesenseClient(): Client {
  return new Client({
    nodes: [
      {
        host: process.env.TYPESENSE_HOST ?? 'localhost',
        port: Number(process.env.TYPESENSE_PORT ?? 8108),
        protocol: process.env.TYPESENSE_PROTOCOL ?? 'http',
      },
    ],
    apiKey: process.env.TYPESENSE_API_KEY ?? '',
    connectionTimeoutSeconds: 3,
    numRetries: 1,
  });
}

export async function isTypesenseHealthy(): Promise<boolean> {
  if (!typesenseConfigured()) return false;
  try {
    const protocol = process.env.TYPESENSE_PROTOCOL ?? 'http';
    const host = process.env.TYPESENSE_HOST;
    const port = process.env.TYPESENSE_PORT ?? '8108';
    const res = await fetch(`${protocol}://${host}:${port}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface SearchHit {
  id: string;
  slug: string;
  title: string;
  [key: string]: unknown;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
  page: number;
  facets: Record<string, Array<{ value: string; count: number }>>;
  engine: 'typesense' | 'postgres';
}

/**
 * Faceted search against one audience's alias. Throws on failure — callers
 * fall back. The public surface only ever searches public_listings; the
 * member off-market index is queried server-side with the member key (§7.1).
 */
export async function searchWithTypesense(
  filters: PropertyFilters,
  audience: SearchAudience = 'public',
): Promise<SearchResult> {
  const client = typesenseClient();
  const page = filters.page ?? 1;
  const perPage = Math.min(filters.limit ?? 24, 100);

  const res = await client
    .collections(aliasFor(audience))
    .documents()
    .search({
      q: '*',
      query_by: 'title',
      filter_by: filtersToTypesense(filters),
      sort_by: sortToTypesense(filters.sort),
      facet_by: FACET_BY,
      page,
      per_page: perPage,
    });

  const facets: SearchResult['facets'] = {};
  for (const facet of res.facet_counts ?? []) {
    facets[facet.field_name as string] = (facet.counts ?? []).map(
      (c: { value: unknown; count: number }) => ({
        value: String(c.value),
        count: c.count,
      }),
    );
  }

  return {
    hits: (res.hits ?? []).map((h: { document: unknown }) => h.document as SearchHit),
    total: res.found ?? 0,
    page,
    facets,
    engine: 'typesense',
  };
}

/**
 * Full reindex with atomic alias swap (spec Prompt 6): index everything into a
 * fresh timestamped collection, point the audience's alias at it, then drop
 * old ones. Search never sees a half-built index.
 */
export async function fullReindex(
  documents: Array<Record<string, unknown>>,
  audience: SearchAudience = 'public',
): Promise<{ collection: string; indexed: number }> {
  const client = typesenseClient();
  const alias = aliasFor(audience);
  const name = `${alias}_${Date.now()}`;

  await client.collections().create({ ...PROPERTY_SEARCH_SCHEMA, name });

  let indexed = 0;
  const BATCH = 100;
  for (let i = 0; i < documents.length; i += BATCH) {
    const batch = documents.slice(i, i + BATCH);
    if (batch.length === 0) continue;
    await client.collections(name).documents().import(batch, { action: 'upsert' });
    indexed += batch.length;
  }

  await client.aliases().upsert(alias, { collection_name: name });

  // Drop superseded physical collections.
  const all = await client.collections().retrieve();
  for (const col of all) {
    if (col.name.startsWith(`${alias}_`) && col.name !== name) {
      await client.collections(col.name).delete().catch(() => undefined);
    }
  }

  return { collection: name, indexed };
}

/**
 * Ensure an audience's alias exists (used by tests and first boot): creates an
 * empty physical collection and points the alias at it when missing.
 */
export async function ensureSearchCollection(audience: SearchAudience): Promise<void> {
  const client = typesenseClient();
  const alias = aliasFor(audience);
  try {
    await client.aliases(alias).retrieve();
    return;
  } catch {
    // fall through — alias missing
  }
  const name = `${alias}_${Date.now()}`;
  await client.collections().create({ ...PROPERTY_SEARCH_SCHEMA, name });
  await client.aliases().upsert(alias, { collection_name: name });
}
