import type { Metadata } from 'next';

import { brand } from '@/config/brand';
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/routing';

/**
 * The single hreflang helper (spec Prompt 6): every page emits alternates for
 * all six locales plus x-default (pointing at English). `path` is the
 * locale-less pathname, e.g. '/', '/collection', '/property/villa-portofino'.
 */
export function hreflangAlternates(
  path: string,
  locale: string = DEFAULT_LOCALE,
): NonNullable<Metadata['alternates']> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? brand.siteUrl).replace(/\/$/, '');
  const suffix = path === '/' ? '' : path;

  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = `${base}/${l}${suffix}`;
  }
  languages['x-default'] = `${base}/${DEFAULT_LOCALE}${suffix}`;

  return {
    // §15.2: each locale page self-canonicalises — never cross-locale.
    canonical: `${base}/${(LOCALES as readonly string[]).includes(locale) ? locale : DEFAULT_LOCALE}${suffix}`,
    languages,
  };
}
