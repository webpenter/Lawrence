import { beforeAll, describe, expect, it } from 'vitest';

import {
  createMemoryNonceStore,
  createSignedAssetToken,
  SIGNED_URL_TTL_MS,
  verifySignedAssetToken,
} from './signed-url';

beforeAll(() => {
  process.env.SIGNED_URL_SECRET = 'test_secret_for_signed_urls_1234567890';
});

describe('signed asset tokens (§8.6 — the private-bucket gate)', () => {
  it('round-trips a valid token with the 15-minute lifetime', () => {
    const now = 1_700_000_000_000;
    const raw = createSignedAssetToken('document', 42, 7, now);
    const result = verifySignedAssetToken(raw, now + 60_000);
    expect(result.ok).toBe(true);
    expect(result.token).toMatchObject({
      kind: 'document',
      assetId: '42',
      memberId: '7',
      expiresAt: now + SIGNED_URL_TTL_MS,
    });
  });

  it('rejects a token after 15 minutes', () => {
    const now = 1_700_000_000_000;
    const raw = createSignedAssetToken('media', 1, 2, now);
    expect(verifySignedAssetToken(raw, now + SIGNED_URL_TTL_MS + 1).ok).toBe(false);
  });

  it('rejects any tampering with the payload', () => {
    const now = 1_700_000_000_000;
    const raw = createSignedAssetToken('document', 42, 7, now);
    // Swap the member id inside the encoded payload: signature must fail.
    const [payload, sig] = [raw.slice(0, raw.lastIndexOf('.')), raw.slice(raw.lastIndexOf('.') + 1)];
    const decoded = Buffer.from(payload, 'base64url').toString('utf8').replace('.7.', '.8.');
    const forged = `${Buffer.from(decoded).toString('base64url')}.${sig}`;
    expect(verifySignedAssetToken(forged, now).ok).toBe(false);
  });

  it('rejects garbage, empty and truncated input without throwing', () => {
    expect(verifySignedAssetToken('').ok).toBe(false);
    expect(verifySignedAssetToken('....').ok).toBe(false);
    expect(verifySignedAssetToken('not-a-token').ok).toBe(false);
    const raw = createSignedAssetToken('media', 1, 2);
    expect(verifySignedAssetToken(raw.slice(0, raw.length - 4)).ok).toBe(false);
  });

  it('mints a fresh nonce per token', () => {
    const a = verifySignedAssetToken(createSignedAssetToken('media', 1, 2)).token?.nonce;
    const b = verifySignedAssetToken(createSignedAssetToken('media', 1, 2)).token?.nonce;
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe('nonce store (single use)', () => {
  it('burns a nonce exactly once', async () => {
    const store = createMemoryNonceStore(() => 1000);
    expect(await store.burn('n1', 60_000)).toBe(true);
    expect(await store.burn('n1', 60_000)).toBe(false);
    expect(await store.burn('n2', 60_000)).toBe(true);
  });

  it('forgets burned nonces after their ttl (memory hygiene, not reuse)', async () => {
    let t = 1000;
    const store = createMemoryNonceStore(() => t);
    await store.burn('n1', 5_000);
    t = 10_000; // token itself would be expired long before this matters
    expect(await store.burn('n1', 5_000)).toBe(true);
  });
});
