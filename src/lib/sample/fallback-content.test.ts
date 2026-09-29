import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fallbackArticle,
  fallbackArticles,
  findFallbackArticle,
  isFallbackContent,
} from './fallback-content';

describe('fallback content (gated demo inventory)', () => {
  beforeEach(() => {
    vi.stubEnv('SAMPLE_DATA_ENABLED', 'true');
  });

  it('serves the demo article by exact slug only', () => {
    const article = fallbackArticle();
    expect(findFallbackArticle(article.slug)).toEqual(article);
    expect(findFallbackArticle('some-other-slug')).toBeNull();
    expect(isFallbackContent(article)).toBe(true);
  });

  it('is disabled when SAMPLE_DATA_ENABLED is not true', () => {
    vi.stubEnv('SAMPLE_DATA_ENABLED', 'false');
    expect(fallbackArticles()).toEqual([]);
    expect(findFallbackArticle(fallbackArticle().slug)).toBeNull();
  });

  it('keeps demo copy free of digits that could read as market statistics (§13.9)', () => {
    const text = (JSON.stringify(fallbackArticle().body).match(/"text":"([^"]*)"/g) ?? []).join(
      ' ',
    );
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toMatch(/\d/);
  });
});
