# LAWRENCE — SEO Playbook

How the programmatic SEO layer works and how to grow it without breaking the
rules that make it rank. Read §13.9 and §14 of the spec first — they are
non-negotiable.

## Adding a landing page (the only growth loop that matters)

1. **Create the record**: Backoffice → Landing Pages → Create. Fill:
   - `title` — natural phrasing, e.g. "Lakefront chalets on Lake Geneva".
   - `slug` — canonical combo form: `<type>-<water>-<place>` tokens,
     lower-kebab (`lakefront-chalets-geneva`). The canonicaliser 301s
     synonyms and re-ordered variants to this slug automatically.
   - `combo` — the actual filters (propertyType, waterBodyType, destination,
     country). The page's listing strip, stats and search link all derive
     from these; never leave them empty.
2. **Write the intro** (this gates publishing): 300–500 words that OPEN with
   a 40–60-word direct answer (§14.6) to "what does this search find?".
   - §13.9: every statistic or market claim needs a named, dated source in
     the text. No source → no number. Descriptive copy needs no source.
3. **FAQ**: 3–6 question-form entries answering real buyer questions
   (mooring rules, tenure, access). These render as `<details>` accordions
   and emit FAQPage JSON-LD — write answers that stand alone.
4. **Publish.** The editorial gate (`passesEditorialGate`) keeps drafts and
   empty-intro pages 404ing; publishing triggers ISR revalidation, sitemap
   inclusion, hreflang alternates and the `/api/public/stats/<combo>` feed.

## Copy rules (short version of §11/§13.9)

- Direct answer first; the reader's question is the first sentence's job.
- No superlatives you can't prove; no "best", no invented market data.
- Metres, not vibes: frontage, depth, LOA — the numbers are the brand.
- One page per intent. If two combos answer the same query, canonicalise
  one into the other rather than writing a twin.

## Internal-link rules

- Every landing page links: its destination page, its `viewAllCta` into
  `/search` with the combo's filters, and up to 8 **sibling** landing pages
  (rankSiblings picks by shared combo dimensions — this is automatic; you
  add nothing by hand).
- Listings link back to their destination and to landing combos they match.
- Never link a draft or gated page; the sitemap and sibling ranker only see
  published pages, so publish-state is the single switch.

## What is automated (do not duplicate by hand)

- Canonical URLs, hreflang for 6 locales, JSON-LD (RealEstateListing,
  BreadcrumbList, FAQPage, Organization, WebSite), OG images per
  listing/landing, sitemap children (properties/landing/destinations/
  articles/static), 410s for expired listings, 301s for renamed slugs,
  noindex on filtered search, samples and sold-older-than-30-days.
- AI discovery: `/llms.txt` and `/llms-full.txt` regenerate from live
  content; §14.6 crawlers are allowed on public content in robots.txt.

## Auditing

`pnpm audit:seo` crawls titles/descriptions/canonicals/JSON-LD over the
sitemap (samples 50 URLs per run). Run it before every content-heavy release
and treat errors as blockers; warnings are the backlog.
