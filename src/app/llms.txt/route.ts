import { NextResponse } from 'next/server';

import { brand } from '@/config/brand';
import { siteBase } from '@/lib/seo/sitemap';

export const revalidate = 3600;

// §15.6: a short Markdown map of the site for LLM agents — what it is, the
// admission threshold, the market index, the data licence, contact.
export function GET(): NextResponse {
  const base = siteBase();
  const body = `# ${brand.name}

> ${brand.description}

## The admission rule

Every property in the Collection is admitted from €20,000,000. A small,
deliberate exception exists for properties of exceptional provenance between
€10M and €20M, admitted case by case and capped at a tenth of the public
collection. Listings from €20–50M carry the Trophy tier; €50M and above,
Signature. Beyond the public Collection an off-market section exists for
registered members; its listings are never published, indexed or included in
any public response.

## Key sections

- [The Collection](${base}/en/collection): the public inventory from €20M.
- [Markets](${base}/en/markets): the research hub — sourced data, editorial and current listings per market.
- [Intelligence](${base}/en/intelligence): reports with ungated summaries; full PDFs require a free account.
- [Journal](${base}/en/journal): editorial on how exceptional property is bought, held and sold.
- [List with us](${base}/en/list-with-us): for agencies with qualifying inventory.

## Machine-readable data

- Market statistics with source and as-of date: ${base}/api/public/markets/{market}/stats
- Sitemaps: ${base}/sitemap.xml

## Data licence and contact

Listing data belongs to the listing agencies and is provided for property
search. Market figures are our own derivations from cited open sources —
quoting them with attribution to ${brand.name} and their asOfDate is
welcome; bulk reproduction of listings is not. Contact: ${brand.email.contact}.

A fuller index: ${base}/llms-full.txt
`;
  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600' },
  });
}
