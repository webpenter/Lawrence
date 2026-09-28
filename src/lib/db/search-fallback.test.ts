import { ANONYMOUS } from '@/lib/access/viewer';
import { describe, expect, it, vi } from 'vitest';

import type { SearchResult } from '@/lib/search/client';

import { searchProperties } from './index';

const postgresResult: SearchResult = {
  hits: [{ id: '1', slug: 'villa', title: 'Villa' }],
  total: 1,
  page: 1,
  facets: {},
  engine: 'postgres',
};

const typesenseResult: SearchResult = { ...postgresResult, engine: 'typesense' };

// Prompt 5 acceptance: killing Typesense still returns results via the fallback.
describe('searchProperties engine selection', () => {
  it('uses Typesense when healthy', async () => {
    const result = await searchProperties(
      ANONYMOUS,
      {},
      {
        healthy: async () => true,
        typesense: async () => typesenseResult,
        postgres: async () => postgresResult,
      },
    );
    expect(result.engine).toBe('typesense');
  });

  it('falls back to Postgres when Typesense is unreachable', async () => {
    const typesense = vi.fn();
    const result = await searchProperties(
      ANONYMOUS,
      {},
      {
        healthy: async () => false,
        typesense,
        postgres: async () => postgresResult,
      },
    );
    expect(result.engine).toBe('postgres');
    expect(typesense).not.toHaveBeenCalled();
  });

  it('falls back to Postgres when Typesense dies mid-query', async () => {
    const result = await searchProperties(
      ANONYMOUS,
      {},
      {
        healthy: async () => true,
        typesense: async () => {
          throw new Error('connection refused');
        },
        postgres: async () => postgresResult,
      },
    );
    expect(result.engine).toBe('postgres');
    expect(result.total).toBe(1);
  });
});
