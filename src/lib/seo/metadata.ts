import type { Metadata } from 'next';

import { brand } from '@/config/brand';

import { hreflangAlternates } from './hreflang';

/**
 * §14.2: ONE helper builds every page's metadata from the §11.4 templates with
 * fallbacks — titles ≤ 60 characters, descriptions clamped toward 140–160,
 * never empty, canonical + hreflang (all locales + x-default) everywhere,
 * OG/Twitter cards with an optional dynamic image.
 */

export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 140;
export const DESCRIPTION_MAX = 160;

/** Trim to a word boundary within the limit, never mid-word, never with "…" spam. */
export function clampTitle(raw: string): string {
  const title = raw.trim().replace(/\s+/g, ' ');
  if (title.length <= TITLE_MAX) return title;
  const cut = title.slice(0, TITLE_MAX + 1);
  const boundary = cut.lastIndexOf(' ');
  return cut.slice(0, boundary > 20 ? boundary : TITLE_MAX).trim();
}

/**
 * Never ship an empty description (§14.2): fall back to the brand description,
 * pad short ones with the fallback sentence, cut long ones at a sentence or
 * word boundary near the maximum.
 */
export function clampDescription(raw: string | null | undefined, fallback = brand.description): string {
  let description = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (!description) description = fallback;
  if (description.length < DESCRIPTION_MIN) {
    description = `${description} ${fallback}`.trim().replace(/\s+/g, ' ');
  }
  if (description.length <= DESCRIPTION_MAX) return description;
  const cut = description.slice(0, DESCRIPTION_MAX + 1);
  const sentence = cut.lastIndexOf('. ');
  if (sentence >= DESCRIPTION_MIN - 20) return cut.slice(0, sentence + 1).trim();
  const boundary = cut.lastIndexOf(' ');
  return cut.slice(0, boundary > DESCRIPTION_MIN - 20 ? boundary : DESCRIPTION_MAX).trim();
}

export interface PageMetadataInput {
  title: string;
  description?: string | null;
  /** Locale-less path, e.g. '/property/villa-portofino'. */
  path: string;
  locale?: string;
  robots?: Metadata['robots'];
  /** Absolute or site-relative OG image URL (dynamic OG routes). */
  ogImage?: string;
  ogType?: 'website' | 'article';
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? brand.siteUrl).replace(/\/$/, '');
  const title = clampTitle(input.title);
  const description = clampDescription(input.description);
  const locale = input.locale ?? 'en';
  const url = `${base}/${locale}${input.path === '/' ? '' : input.path}`;
  const image = input.ogImage
    ? input.ogImage.startsWith('http')
      ? input.ogImage
      : `${base}${input.ogImage}`
    : undefined;

  return {
    title,
    description,
    robots: input.robots,
    alternates: hreflangAlternates(input.path, locale),
    openGraph: {
      title,
      description,
      url,
      siteName: brand.name,
      type: input.ogType ?? 'website',
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
