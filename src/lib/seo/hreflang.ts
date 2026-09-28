import type { Metadata } from 'next';

import { brand } from '@/config/brand';
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/routing';

/**
 * The single hreflang helper (spec Prompt 6): every page emits alternates for
 * all six locales plus x-default (pointing at English). `path` is the
 * locale-less pathname, e.g. '/', '/collection', '/property/villa-portofino'.
 */
export function hreflangAlternates(path: string): NonNullable<Metadata['alternates']> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? brand.siteUrl).replace(/\/$/, '');
  const suffix = path === '/' ? '' : path;

  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = `${base}/${locale}${suffix}`;
  }
  languages['x-default'] = `${base}/${DEFAULT_LOCALE}${suffix}`;

  return {
    canonical: `${base}/${DEFAULT_LOCALE}${suffix}`,
    languages,
  };
}
