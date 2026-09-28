import 'dotenv/config';

/**
 * `pnpm search:keys` — §7.1: the browser only ever receives the PUBLIC
 * search-only key. This provisions two scoped search-only Typesense keys:
 *
 *   TYPESENSE_PUBLIC_SEARCH_KEY → search on public_listings only (shippable
 *     to the client bundle);
 *   TYPESENSE_MEMBER_SEARCH_KEY → search on member_listings only (used
 *     SERVER-SIDE by the off-market routes; never sent to a browser).
 *
 * Prints the generated keys once — copy them into the environment. Idempotent
 * in effect: re-running mints new keys; rotate by updating the env and
 * (optionally) deleting old keys in the Typesense dashboard.
 */

function url(path: string): string {
  const protocol = process.env.TYPESENSE_PROTOCOL || 'http';
  const host = process.env.TYPESENSE_HOST;
  const port = process.env.TYPESENSE_PORT || '8108';
  return `${protocol}://${host}:${port}${path}`;
}

async function createSearchKey(description: string, collection: string): Promise<string> {
  const res = await fetch(url('/keys'), {
    method: 'POST',
    headers: {
      'X-TYPESENSE-API-KEY': process.env.TYPESENSE_API_KEY as string,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description,
      actions: ['documents:search'],
      collections: [collection, `${collection}_*`],
    }),
  });
  if (!res.ok) throw new Error(`key creation failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { value: string };
  return data.value;
}

async function main(): Promise<void> {
  if (!process.env.TYPESENSE_HOST || !process.env.TYPESENSE_API_KEY) {
    console.error('TYPESENSE_HOST / TYPESENSE_API_KEY are not set.');
    process.exit(1);
  }

  const publicKey = await createSearchKey('public search-only (browser-safe)', 'public_listings');
  const memberKey = await createSearchKey('member search-only (server-side only)', 'member_listings');

  console.log('Add these to the environment (the member key must NEVER ship to a browser):');
  console.log(`TYPESENSE_PUBLIC_SEARCH_KEY=${publicKey}`);
  console.log(`TYPESENSE_MEMBER_SEARCH_KEY=${memberKey}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('search:keys failed:', err);
  process.exit(1);
});
