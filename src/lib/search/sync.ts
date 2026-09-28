/**
 * Incremental Typesense sync, called from Property afterChange/afterDelete hooks.
 *
 * §7.1: two physically separate collections. A public listing lives ONLY in
 * public_listings; an off-market listing lives ONLY in member_listings. Every
 * upsert into one side deletes from the other, so a channel flip can never
 * leave a stale off-market document on the public surface.
 *
 * Prompt 6 supplies the full schema, alias-swap reindex and Postgres fallback;
 * this module owns the incremental path. Sync failures must never fail a save —
 * Postgres is the source of truth and a full reindex (`pnpm search:reindex`)
 * repairs any drift.
 */

import { aliasFor, type SearchAudience } from './schema';

function typesenseConfigured(): boolean {
  return Boolean(process.env.TYPESENSE_HOST && process.env.TYPESENSE_API_KEY);
}

function typesenseUrl(path: string): string {
  const protocol = process.env.TYPESENSE_PROTOCOL || 'http';
  const host = process.env.TYPESENSE_HOST;
  const port = process.env.TYPESENSE_PORT || '8108';
  return `${protocol}://${host}:${port}${path}`;
}

export async function upsertListingDocument(
  audience: SearchAudience,
  doc: Record<string, unknown>,
): Promise<void> {
  if (!typesenseConfigured()) return;
  try {
    await fetch(typesenseUrl(`/collections/${aliasFor(audience)}/documents?action=upsert`), {
      method: 'POST',
      headers: {
        'X-TYPESENSE-API-KEY': process.env.TYPESENSE_API_KEY as string,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(doc),
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.error(`[search-sync] ${audience} upsert failed (reindex will repair):`, err);
  }
}

export async function deleteListingDocument(
  audience: SearchAudience,
  id: string | number,
): Promise<void> {
  if (!typesenseConfigured()) return;
  try {
    await fetch(typesenseUrl(`/collections/${aliasFor(audience)}/documents/${id}`), {
      method: 'DELETE',
      headers: { 'X-TYPESENSE-API-KEY': process.env.TYPESENSE_API_KEY as string },
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.error(`[search-sync] ${audience} delete failed (reindex will repair):`, err);
  }
}

/** Remove a listing from both surfaces (delete, unpublish, admission failure). */
export async function deleteListingEverywhere(id: string | number): Promise<void> {
  await Promise.all([
    deleteListingDocument('public', id),
    deleteListingDocument('member', id),
  ]);
}
