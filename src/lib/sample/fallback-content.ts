import { textToLexical } from '@/lib/lexical';
import type { Article } from '@/payload-types';

import { sampleFallbackEnabled } from './fallback';

/**
 * Demo journal content for the gated sample fallback (§13.12). Served ONLY
 * when the database errors and SAMPLE_DATA_ENABLED=true, exactly like the
 * fallback listings. Everything here is deliberately free of statistics and
 * market claims (§13.9) — descriptive, general-knowledge copy a reader can
 * verify, marked as demonstration content and noindexed.
 */

const SEED_DATE = '2026-01-05T09:00:00.000Z';

export const DEMO_ARTICLE = {
  slug: 'sample-buying-through-a-structure',
  title: 'Buying through a structure: the three questions that matter',
  excerpt:
    'What the holding structure is for, what it costs to run each year, and how it sells on — a practical checklist for the first meeting with counsel.',
} as const;

export const ARTICLE_PARAGRAPHS = [
  'Buying a significant property through a company or trust rather than in a personal name involves three questions that are worth answering before any offer: what the structure is for, what it costs to maintain, and what happens on exit.',
  'Purpose first. Structures exist for legitimate, boring reasons — succession planning across two or more jurisdictions, co-ownership between family branches, or lender requirements. A structure chosen for the wrong reason, typically opacity for its own sake, tends to create friction at resale and with banks. The advisers should be able to state the purpose in one sentence.',
  'Second, the running costs. A holding entity files accounts, pays registered-agent and administration fees, and in several European jurisdictions attracts an annual tax charge unless exemptions are actively claimed each year. These are known, quotable figures — ask for the full annual schedule in writing before committing to the vehicle.',
  'Third, the exit. Some buyers will happily acquire the entity itself; many prefer the asset clean. A sale of shares and a sale of the property are taxed differently, complete on different timescales, and demand different due diligence. Knowing which exit the market in that jurisdiction actually prefers is part of choosing the structure at entry.',
  'None of this is a reason to hesitate — it is a checklist for one meeting with a local notary or counsel. The point of asking early is that the answers shape the offer itself: the price, the timetable and the conditions all read differently through a structure.',
];

let cachedArticle: Article | null = null;

/** The single demo journal article, deterministic across calls. */
export function fallbackArticle(): Article {
  if (!cachedArticle) {
    cachedArticle = {
      id: -1,
      title: DEMO_ARTICLE.title,
      slug: DEMO_ARTICLE.slug,
      excerpt: DEMO_ARTICLE.excerpt,
      body: textToLexical(...ARTICLE_PARAGRAPHS) as Article['body'],
      publishedAt: SEED_DATE,
      updatedAt: SEED_DATE,
      createdAt: SEED_DATE,
      _status: 'published',
    };
  }
  return cachedArticle;
}

export function fallbackArticles(): Article[] {
  return sampleFallbackEnabled() ? [fallbackArticle()] : [];
}

export function findFallbackArticle(slug: string): Article | null {
  if (!sampleFallbackEnabled()) return null;
  const article = fallbackArticle();
  return article.slug === slug ? article : null;
}

/** Fallback pages have negative ids — used to noindex demo journal pages. */
export function isFallbackContent(doc: { id: number }): boolean {
  return doc.id < 0;
}
