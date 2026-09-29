import { describe, expect, it } from 'vitest';

import { hreflangAlternates } from './hreflang';

describe('hreflangAlternates (Prompt 6 acceptance)', () => {
  it('emits all six locales plus x-default on every page', () => {
    const alternates = hreflangAlternates('/collection');
    const languages = alternates.languages as Record<string, string>;
    for (const locale of ['en', 'it', 'fr', 'de', 'es', 'ru']) {
      expect(languages[locale]).toMatch(new RegExp(`/${locale}/collection$`));
    }
    expect(languages['x-default']).toMatch(/\/en\/collection$/);
  });

  it('handles the home path without a trailing slash', () => {
    const alternates = hreflangAlternates('/');
    const languages = alternates.languages as Record<string, string>;
    expect(languages.en?.endsWith('/en')).toBe(true);
    expect(languages.it?.endsWith('/it')).toBe(true);
  });

  it('canonical defaults to the default locale when no locale is given', () => {
    expect(String(hreflangAlternates('/about').canonical)).toMatch(/\/en\/about$/);
  });

  it('canonical self-references the requesting locale (§15.2)', () => {
    expect(String(hreflangAlternates('/about', 'fr').canonical)).toMatch(/\/fr\/about$/);
    expect(String(hreflangAlternates('/', 'ru').canonical)).toMatch(/\/ru$/);
  });

  it('falls back to the default locale for an unknown locale value', () => {
    expect(String(hreflangAlternates('/about', 'xx').canonical)).toMatch(/\/en\/about$/);
  });
});
