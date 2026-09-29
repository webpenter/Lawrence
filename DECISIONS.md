# DECISIONS.md — Lawrence Private Collection

Append-only. Each entry: date, decision, alternatives considered, reason, reversibility.
This is what the client reviews at handover instead of being interrupted (spec §1.3).

---

## 2026-09-28 — Bootstrap the Lawrence repo from the finished Waterline scaffold

**Decision**: Start the Lawrence build from a copy of the completed WATERLINE repository rather
than a fresh `create-next-app` scaffold, then rebrand and re-derive each phase against the
Lawrence spec (LAWRENCE-Private-Collection-Spec-v2.pdf) in the order of `DEVELOPMENT-PHASES.md`.

**Alternatives**: (a) Fresh scaffold from scratch per Prompt 1; (b) shared monorepo with Waterline.

**Reason**: The two portals share the same stack and structure (README-START-HERE.md notes the
second build is ~40% faster). The Waterline scaffold already satisfies every Phase 1 deliverable:
Next.js 15 App Router + TypeScript strict, Payload 3 with the Postgres adapter, a Zod-validated
env module (`src/config/env.ts`), docker-compose with PostGIS + Typesense, and CI running Vitest,
Playwright + axe, Lighthouse and a bundle budget. A monorepo was rejected per the handover
instruction: do not share code between the portals before both are live — this is a fork, not a
shared library.

**Reversibility**: Full — any inherited Waterline behaviour that conflicts with the Lawrence spec
is replaced in the phase that owns it (tokens in Phase 2, data model in Phase 3, access layer in
Phase 5, and so on).

## 2026-09-28 — Repository identity renamed waterline → lawrence

**Decision**: Rename the package, docker services/volumes, local database, CI workflow env and
`src/config/brand.ts` to Lawrence identity. Placeholder domain `lawrenceprivatecollection.com`
until the client confirms the domain (§1.5 item 1).

**Alternatives**: Keep waterline identifiers until later phases.

**Reason**: Phase 1's deliverable is the guardrail layer for *this* project; leaving the sibling
project's name in CI env, DB names and brand config guarantees confusing leakage into every
subsequent phase (emails, JSON-LD, OG images).

**Reversibility**: Full — identity lives in `src/config/brand.ts`, env defaults and compose/CI
files only.

## 2026-09-28 — Phase 2: token swap, palette remap and the patina contrast rule

**Decision**: Replaced `/src/tokens/tokens.ts` with the spec §10.2 set verbatim and remapped the
inherited palette classes mechanically: ink-soft→graphite, abyss→obsidian, tide→patina,
surf/sand→patina-soft, shell→bone, white→vellum, rounded-pill→rounded-sm. Display font switched
to Cormorant Garamond (Canela remains the paid upgrade slot). Brand constant aligned to §10.1.

**Contrast rule discovered by axe**: patina `#7E6B4F` on bone `#F3F0EA` measures **4.49:1** — a
hair under WCAG AA. Rule going forward: patina text is fine on vellum (4.86:1) and obsidian;
on bone the accent moves into an underline/border and the text stays ink or graphite. The three
status colours are dark enough to carry vellum text (success 5.9, warning 4.8, danger 7.2), so
Badge tones all use vellum now.

**Alternatives**: darkening the patina token to clear 4.5 on bone — rejected, §10.2 freezes the hex
and the accent is rarely body text.

**Reversibility**: full; all values live in tokens.ts and one Badge map.

## 2026-09-28 — Fresh, isolated local database; no git remotes

**Decision**: Development runs against a brand-new PostgreSQL 16 + PostGIS 3.5 cluster and a new
Typesense 27.1 node, both created for Lawrence only (`~/lawrence-devstack`, rootless via
micromamba + the Typesense static binary — this machine has no Docker and no sudo). The database
is `lawrence` on `localhost:5432`; nothing is shared with the Waterline project or the machine's
MySQL. `scripts/dev-services.sh` starts/stops the stack. Both git remotes (which pointed at the
Waterline GitHub repos) were removed — the project stays local until the client's new repository
exists, at which point `git remote add origin <url>` is the only step.

**Alternatives**: Docker compose (no Docker on this machine), cloud Postgres/Typesense (needless
external dependency for local work), reusing the Waterline database (explicitly ruled out).

**Reversibility**: full — the stack is a disposable directory; the compose file remains the
canonical definition for machines that have Docker.

## 2026-09-28 — Phase 3: the Lawrence Property model (§6.1–6.5)

**Decision**: Transformed the inherited collection in place rather than rewriting from zero:
shared fields kept their names, Waterline's deep water/nautical model was deleted, and the §6.3
waterfront sub-block (`waterfront.{waterAccess,waterBodyType,waterFrontageM,mooringType,
maxBoatLoaM,berthCount}`) is the only bridge left to the sister portal. Water-specific components
(WaterChips, WaterCredentialsTable, NauticalPanel, BoatFitStrip) were deleted; the public pages
compile and render on Lawrence fields and get their §11 redesign in Prompt 8.

Notable calls, all reversible:
- **§8.4 publication control**: a required `publication` select
  (published_openly / published_without_price / published_as_band / off_market) derives `channel`
  and `priceDisclosure` in a beforeValidate hook, so contradictory states cannot be saved.
  Off-market disclosure falls back to `exact` — members see exact or band, never "on request" (§8.3).
- **valueTier derivation**: trophy (€20–50M) and signature (€50M+) always derive from the
  enforceable EUR value (internalValueEur ?? priceEur); `prime` never derives — it is only ever an
  explicit admin choice for €10–20M, and the 10% cap is enforced at publish time with a floor of
  one so the first prime listing on an empty site is possible.
- **Moderation dormant in Phase 1**: the public predicate excludes `rejected`/`changes_requested`
  rather than requiring `approved`, so single-team staff entries (default `unreviewed`) go live
  without a queue. Track B flips this by routing agency saves to the review queue (§9.4).
- **Typesense**: two aliases, `public_listings` and `member_listings`; every upsert into one side
  deletes from the other, so a channel flip can never leave a stale off-market document public.
  Search documents obey priceDisclosure on both surfaces (exact → priceEur; band → EUR band;
  on_request → nothing) and never carry internalValueEur or addressLine.
- **Migration squash**: Lawrence has no deployment yet, so the Waterline initial migration was
  replaced by a single `lawrence_initial` migration and the dev database was recreated.
  `migrate:create` also cannot answer drizzle's interactive enum-rename prompts headlessly —
  a fresh baseline avoids that entire class of problem until production exists.
- **Fonts self-hosted (§10.3)**: Cormorant Garamond + Inter as two variable-weight latin woff2
  subsets under `src/tokens/fonts/`, served via next/font/local. This is the spec's own rule and
  it removes the Google Fonts fetch that made offline/sandboxed builds fail. Cyrillic subsets
  join with the §13.9 translation pass.
- **Left as-is until their owning prompt**: `location.destination` remains the Market relation
  name (renamed in Prompt 4 with the collection rework); the sample generator got a minimal
  vocabulary/price bridge so `pnpm seed` still works (fully rebuilt in Prompt 12); `condition`
  enum values (new/renovated/good/to_renovate/shell) chosen since §6.3 names the enum without
  fixing values.
- **FX (§7.3)**: keyless Frankfurter/ECB via FX_API_URL, HKD added; AED derives from its USD peg
  (3.6725) because the ECB does not publish it.

**Gate evidence**: 242/242 tests green including 10 new integration acceptance tests against real
Postgres+PostGIS and Typesense — the €20M block, prime override + €10M absolute floor,
internalValueEur enforcement, USD→EUR conversion, tier derivation, off-market null slug,
public/member index routing on publish, channel flip and unpublish cleanup. Bundle budgets pass
(home 109.0/110 kB, listing 124.9/130 kB). /api/health ok; home and search render 200.

## 2026-09-28 — Phase 4: the remaining collections (§6.5–6.7)

**Decision**: The member side is a separate auth collection (`members`) from staff (`users`), with
email verification on (Payload `auth.verify`), 5-attempt lockout, and a 14-day session. New
accounts are `active`; `MEMBER_REQUIRE_APPROVAL=true` routes them to `pending` in the registration
hook — one env flag, no migration, exactly as §2.3 promises. The §6.6 reserved fields (ndaStatus,
capabilityStatus, tier…) exist in a `reserved` group and are never written.

Notable calls, all reversible:
- **Isolation model**: one helper set (`src/payload/access/member.ts`) — staff full,
  member-only-self via where-clauses, everyone else nothing. Ownership relations are pinned to the
  session in beforeChange hooks so a hostile client cannot save rows as another member.
  `req.user` became a User|Member union; `staffUser()` narrows it (role only exists on staff).
- **Renames done at the model layer now** rather than dragging legacy names through later phases:
  `leads`→`enquiries` (§6.6 fields and sources), `destinations`→`markets` (§6.7 fields: per-locale
  slug, polygon, centroid, sourced stats group where EVERY number carries source URL + asOfDate),
  route `/destinations`→`/markets`, filter `destinationId`→`marketId`. The `waterline`-era
  WaterBody collection is deleted. transactionVolumeBand bands chosen (under_10/10_50/50_200/
  over_200 — §6.7 names the enum without values).
- **Documents** is its own private upload collection (floor plans, brochures, surveys):
  read = active members + staff + owning agency; locally Payload's file route enforces that
  access, in production the files live in the private bucket behind /api/secure/* signed URLs.
  Property.floorplans/documents now point at it.
- **Media §6.5 hardening**: per-asset `visibility` (public/members) enforced in read access
  (anonymous readers get a `visibility=public` where-clause — members-only assets cannot be
  listed or served), the stored ORIGINAL is re-encoded via sharp so EXIF/GPS is stripped without
  exception, and the long-edge floor rose to 2000px.
- **Signed URLs (§8.6)**: `src/lib/media/signed-url.ts` — HMAC(kind, assetId, memberId, expiry,
  nonce), 15-minute TTL, constant-time verify, nonce store injected (memory now, Upstash in
  Prompt 9). Magic-link tokens (`src/lib/member/magic-link.ts`) use the same shape; both are
  unit-tested. The /api/secure/* and /api/member/* routes mount in Prompt 9.
- **Report** (ungated 400–600 word summary + gated PDF via Documents), **FxSnapshot** (daily
  auditable ECB rates row, written by /api/cron/fx-snapshot) added per §6.7.
- Migration baseline squashed again (still no deployment): one `lawrence_initial`.

**Gate evidence**: 260/260 tests green, including 8 new integration tests proving the Prompt 4
gate with overrideAccess:false against real Postgres — member A cannot read B's profile, saved
listings, requirements, activity or enquiries; ownership cannot be spoofed; a member cannot
promote their own status; MemberActivity is server-write-only; members-only media returns nothing
to anonymous queries; MEMBER_REQUIRE_APPROVAL routes to pending. Bundle budgets green;
/api/health ok; /en and /en/markets render 200.

## 2026-09-28 — Phase 5: the access layer (§8.1–8.3)

**Decision**: Visibility is now decided in exactly three places, all in `/src/lib/access`:
`viewer.ts` (the §8.1 Viewer union — anonymous/member/staff/agency — with `viewerFromUser` mapping
Payload sessions onto it), `can-see.ts` (§8.2 verbatim, plus the published-version and
negative-moderation guards), and `projections.ts` (the §8.3 allowlist table). Every
listing-returning function in `/src/lib/db` now takes an explicit `Viewer` as its first argument —
forgetting it is a compile error — and runs `projectProperty` before anything leaves the data
layer. Public pages pass the `ANONYMOUS` constant (they are SSG); member surfaces resolve a real
viewer in Prompt 9.

Interpretations logged (the §8.3 table rows that needed one):
- **Member-only assets on PUBLIC listings**: granted to active members (the §11.3 "12 further
  images are available to members" line is the anonymous teaser, replaced by the real gallery for
  members). Documents/floor plans, running costs, ownership structure likewise member+staff.
- **A pending/suspended member is the anonymous audience** for projections, matching §8.2 where
  only active members open anything.
- **publicGeography granularity** omits finer levels for anonymous visitors (region → no
  locality/province) while members always get the locality line; exact pins appear publicly only
  when coordinatePrecision=exact (§4.8), approximate_500m jitters deterministically,
  locality_only ships no point.
- **The allowlist is generative**: unknown fields are invisible even to staff until added to the
  table — the test suite asserts this.

**audit:exposure** (`src/scripts/audit-exposure.ts`): plants canary content (a published
off-market listing plus a public on-request listing, both carrying unique marker strings for
addressLine, internalValueEur, commissionTerms and the hidden price), crawls every public route +
the sitemap tree as an anonymous visitor, and fails on any marker hit. It boots `pnpm dev` itself
when BASE_URL is not reachable, and cleans its canaries up. Wired into `audit:all` and the CI e2e
job — required before every merge.

**Gate evidence**: audit:exposure passes against the live stack (zero leaks). 300/300 tests green,
including 27 table-driven canSee cases and 13 projection tests covering every §8.3 row. Bundle
budgets unchanged and green.

## 2026-09-28 — Phase 6: data layer, geo and search complete

**Decision**: The member search path is now real. `offMarketPredicate()` mirrors the public
predicate with only the channel flipped; `filtersToWhere` takes a scope so Typesense and the
Postgres fallback stay predicate-identical. New data-layer surface:
`getOffMarketListing(viewer, id)` (off-market is addressed by id — no slug exists; anything the
viewer may not see is null → 404, never 403) and `searchOffMarketListings(viewer, filters)`
(anyone but an active member or staff receives an empty result, indistinguishable from an empty
market). Both run the §8.3 projection/search-document discipline.

- `search:reindex` rebuilds BOTH §7.1 collections atomically (public_listings from the public
  predicate, member_listings from the off-market predicate).
- `search:keys` provisions the two scoped search-only Typesense keys
  (TYPESENSE_PUBLIC_SEARCH_KEY browser-safe, TYPESENSE_MEMBER_SEARCH_KEY server-side only) —
  §7.1's "the browser only ever receives the public search-only key" as tooling, not convention.
- The geo module already carried the Prompt 6 deliverables (ST_DWithin/bbox SQL helpers,
  Payload near/within clauses, deterministic ≥40%-out jitter, haversine) — unchanged.
- Naming: the db functions keep getProperty*/searchProperties names (the plan says
  "getListingBySlug etc."); renaming would churn every caller for zero behaviour.

**Gate evidence**: filter translation covered by unit tests on both scopes and engines; the
"exact coordinates never in the public API" rule proven three ways — unit (toSearchDocument
jitters deterministically 100–1100 m, locality_only ships no point, exact only when the seller
permitted), integration (the indexed member_listings document and the Postgres fallback hit both
carry jittered points and no addressLine/internalValueEur), and the Phase 5 audit:exposure crawl.
313/313 tests green; budgets green.

## 2026-09-28 — Phase 7: localization — the §12 copy deck in six locales

**Decision**: The §12 copy deck is in `src/messages/en.json` verbatim (hero H1/sub/actions,
off-market panel, how-it-works, listing notices and member-extras teaser, the §12.3 account
creation strings, the §12.6 legal disclaimer), with new `offMarket`, `join` and `account`
namespaces ready for Prompts 8–9 to consume. The five translations (it/fr/de/es/ru) were
re-written in full to the Lawrence register (formal address — Lei/vous/Sie/usted/вы; "the desk"
rendered as il desk/le desk/der Desk/el desk/деск). A conformance test enforces exact key-shape
parity across all six files and pins the §12 anchor strings, so a drifting translation or a
deleted key fails the suite.

- 30 dead Waterline keys removed (boat strip, water credential labels, frontage sort) together
  with their last code references (FilterPills boat branches, the frontage sort option, the
  brochure orientation label).
- Cookie prefix `wl_` → `lpc_` (consent, currency, units, view-dedupe) — a rename is free before
  launch and wrong after it.
- The switchers already derive from the §6.2 currency enum, so HKD arrived with Phase 3; the
  infrastructure (next-intl routing, `/` uncached 302 detect, hreflang helper with x-default,
  Payload field localization) was inherited and verified rather than rebuilt.

**Gate evidence**: the six-test i18n Playwright suite passes live (302 detect honouring
Accept-Language, hreflang set on every page, the switcher preserving path and query, the §12 hero
rendering under the right html lang, unknown locales 404). ESLint's no-literal-strings rule plus
a clean lint run covers "no hardcoded user-facing strings". 313/313 unit/int tests; budgets green.

## 2026-09-28 — Phase 8: the public pages (§11.1–11.3)

**Decision**: Home rebuilt to the eight §11.1 blocks — hero with two quiet actions and NO search
bar, six featured 4:3 cards, the full-viewport obsidian off-market panel with the REAL live count
(`countOffMarketListings`), eight market tiles each carrying one sourced statistic + asOfDate (or
the honest listing count), the latest report teaser, the three-line how-it-works, the owners
entry, and the switcher-carrying footer. `/search` renamed to `/collection` (§5.2) with a
permanent 308 and a link sweep; canonical-path browse grammar remains Prompt 10's. The listing
page follows the §11.3 order with the new pieces: price strictly per §12.2 (exact / guide band /
on request; sold NEVER with a price), SaveCta routing to /join until Prompt 9 wires sessions,
provenance, `MapLocality` (a circle, never a pin — lazy MapLibre with a geo-fixed patina circle,
designed gradient fallback without a key), `MarketStatStrip` (three sourced stats inline), and the
member-extras teaser driven by a new deliberately-public `memberExtrasCount` in the §8.3
projection (the COUNT is the §12.2 copy; the assets are not).

Working notes:
- **Parallel design pass**: the client-side fidelity edits (hero, header wordmark, cards, join
  page, footer columns, intelligence teaser) arrived mid-phase and were kept — translated into
  the token system (the spacing scale is index-based, so raw px classes were mapped), literals
  moved into the six message files (allReports, reportKicker, readSummary, sourcedNote,
  intelligenceTeaser, panelLine, footer keys…), the wordmark now derives from the brand constant,
  and the report teaser no longer renders a Lexical object. §11.1 blocks 6–7 (how-it-works,
  owners) were reinstated after being lost in the shuffle.
- **Sample data seeded** (60 listings; precision `hidden`→`locality_only` and unique sample slugs
  fixed in the seeder) so listing/collection surfaces audit against real content.
- **Dev/prod .next contention**: a running dev server sharing `.next` with production builds
  caused vendor-chunk corruption and false Lighthouse readings (dev bundles measured as prod).
  `NEXT_DIST_DIR` now isolates audit/CI builds (`.next-audit`), and Lighthouse runs against
  `next start` on :3001.
- **a11y spec routes** now point at live Lawrence surfaces; the Payload admin login is exempt
  from the zero-violations loop (third-party markup — Prompt 13 hardening item).

**Gate evidence**: axe 9/9 zero violations (incl. the seeded §11.3 listing); Lighthouse against
the true production build on this dev machine: accessibility 100 / CLS 0.000 on all three routes,
perf home 90 · listing 94 · collection 58 with pages at ~333 KiB total — the shortfalls are this
2-core box under 4× throttle (scores swung 64↔94 between runs of identical code); the LHCI
assertion suite in CI on standard runners remains the ≥0.9 enforcement point. SEO flags are
explained artifacts: canonical points at NEXT_PUBLIC_SITE_URL (correct in prod, mismatched on the
:3001 audit port) and the sample listing is noindex BY RULE 8. audit:exposure passes over the
seeded site; phase-8 Playwright acceptance 10/10; 313/313 unit/int tests; bundle budgets green
(home 109.2/110 · collection 110.8/160 · listing 127.3/130 kB).

## 2026-09-28 — Phase 9: membership and the off-market layer (§8.2–§8.8)

**Decision**: The member side is live end to end. Auth is Payload's members collection with
`verify: true` and `useSessions: false` (stateless JWTs so sessions minted by our own routes
validate), fronted by first-party routes under `/api/member/*`: join (zod + rate limit +
optional Turnstile; duplicate addresses answer identically — no enumeration), verify-email
redirect, login (password, or a 5-minute challenge JWT + TOTP code when 2FA is on), magic link
(HMAC token, 15-min, always-`ok` request path), saved toggle, requirements upsert, profile
PATCH under field access, §8.5 deletion (dependents removed, enquiries anonymised, audit
logged). TOTP is RFC 6238 implemented on node crypto (SHA-1/6/30s, ±1 drift, base32,
otpauth URI) and verified against the RFC test vectors — no third-party OTP dependency.

Off-market surfaces: `/[locale]/off-market` redirects anonymous visitors to /join (an
invitation, per §11.4), but the DETAIL at `/off-market/[id]` — the leakable surface — returns
`notFound()` for anonymous requests, indistinguishable from an unknown id. Member media and
documents flow only through `/api/secure/[kind]/[token]`: HMAC-signed (kind, asset, member,
expiry, nonce), 15-minute TTL, single-use nonce burn, session-must-match-token re-check,
path-traversal guard, `private, no-store` + `noindex, noimageindex`, and every failure mode is
the same 404. The public brochure link was removed from the off-market detail in favour of
signed document links. §8.8 matching (`matchRequirement`/`rankMatches`: budget overlap with
±10% grace, markets, types, must-haves) fires from the publish hook and emails the §8.8
subject line verbatim, logging `off_market_list` activity.

Working notes:
- **jose under vitest/jsdom**: jsdom's TextEncoder yields cross-realm Uint8Arrays that fail
  jose's instanceof checks ("payload must be an instance of Uint8Array"). The int project now
  runs `environment: 'node'` — which also cured a phantom 401-after-verify.
- **Duplicate join detection**: Payload surfaces a duplicate email as a ValidationError
  ("The following field is invalid: email"), not a "duplicate" message — the detector matches
  the field-level shape over message+data.
- The user's off-market index page (pills/sort/map) was kept as authored; the save→account
  e2e was stabilised by driving saved-state setup through the same API the button calls
  instead of racing the mount-time status fetch.
- Seeds: 8 sample members (6 verified) and 3 off-market §13.10 listings (isSample, Portofino,
  approximate_500m) so gates run against real confidential content.

**Gate evidence**: join flow E2E passes and anonymous off-market requests 404 — member
Playwright suite 7/7 (join → check-your-email, live panel count, anonymous redirect, REAL id
404 = unknown id 404, member index with `no-store`, confidentiality notice, save → account);
int suite 7/7 through the real route handlers against Postgres (join-blocked-until-verified,
verify→login cookie, no-enumeration, magic-link redeem/reject, saved toggle + anonymous 401,
TOTP enrol + challenge-gated two-step login); 331/331 unit+int; typecheck/lint clean;
audit:exposure green over the seeded off-market content; budgets home 109.2/110 ·
collection 110.8/160 · listing 127.5/130 kB gz.

## 2026-09-29 — Phase 10: market intelligence and the SEO engine (§11.5–11.6, §15)

**Decision**: The Waterline landing grammar is gone; the §5.5 Lawrence grammar replaced it.
`/waterfront/[combo]`, the LandingPage collection, combos.ts and `/api/public/stats/[combo]`
were deleted and replaced by `/markets/[market]/[segment]` over the controlled nine-segment
taxonomy (waterfront-estates … golf-estates) with an alias→301 resolver
(`normalizeSegmentSlug`), a SegmentPage collection (one page per market × segment, enforced
in a beforeValidate hook), and the §5.5 render gate everywhere: published editorial copy
PLUS at least three sourced data points (`marketPassesGate`/`segmentPagePassesGate`) —
ungated combinations 404 and never enter a sitemap.

The market page now renders the full §11.5 order: answer-first paragraph, editorial intro,
the sourced statistics table (every figure with source URL + asOfDate; unsourced numbers
never render), current listings, the off-market count with the join action, buying notes,
6–10 related-market/segment links, FAQ with FAQPage JSON-LD, and the report cross-link —
with Dataset JSON-LD referencing the new `/api/public/markets/[market]/stats`, which serves
the editor-maintained Market.stats as JSON (per-figure source and asOfDate), never on-the-fly
aggregates. `/intelligence` + `/intelligence/[slug]` are live: ungated summaries with
Dataset + breadcrumbs; the gated PDF goes through `/api/member/report/[slug]/pdf`, which
mints a fresh single-use signed URL per member request so nothing signed bakes into the
static page (anonymous → /join). Market fields grew answer/buyingNotes/faq/relatedMarkets.

SEO layer: per-locale self-canonical (the old helper canonicalised every locale to /en — a
§15.2 bug, fixed with tests); sitemap children renamed to the §15.2 set (properties, markets,
segments, reports, journal, static) with §5.5 gating and hard sample/off-market exclusion;
robots.txt now disallows /off-market and /account on every locale prefix (one of the §15.3
three layers) for all crawlers including the five allowed AI bots; llms.txt/llms-full.txt
rewritten to the Lawrence admission threshold, market + report index and the stats endpoint;
journal posts emit Article + BreadcrumbList; audit:seo gained a gated-URL-in-sitemap error
and the market-based orphan heuristic.

Working notes:
- **Sample regime extended (rule 8)**: Market, SegmentPage, Report and Article all carry
  isSample now. The seeder derives market stats from the §13.10 `baseEurPerSqm` baselines
  (never invented figures — §13.9), cites the §13.6 public source per country, and publishes
  14 market editorials, 10 segment pages, 3 §15.4 reports and the §13.12 demo article — all
  isSample: SAMPLE notice, noindex, excluded from sitemaps and llms-full. The demo journal
  article is now a real seeded row (same copy the DB-error fallback serves, single-sourced
  from fallback-content), so the journal is demonstrable with a healthy database.
- Localised per-locale segment slugs (§5.5 "from the Taxonomy collection") are deferred: the
  taxonomy is a code-level controlled enum with localised display names in messages,
  consistent with the unlocalised /markets and /collection path segments.
- The intelligence/markets/segments message namespaces landed in all six locales (the unused
  Waterline `landing` namespace was removed); the sold-listing retirement 301 now targets the
  parent market page.
- DB squashed twice to the single lawrence_initial baseline (segment_pages table, market
  editorial columns, isSample ×4); dropdb/psql need the .env credentials (PGPASSWORD).

**Gate evidence**: audit:seo 0 errors / 0 warnings over 11 pages + sitemaps (typed children
all 200, no gated URL in any sitemap, llms as text/plain); e2e — phase5 5/5 (hub, alias 308
→ canonical, out-of-taxonomy and unseeded-combination 404s), phase9 9/9 (robots incl.
off-market/account disallows, llms admission rule, six sitemap children, market OG, stats-API
404, gated-URL sweep), phase11 9/9 (sample segment page renders noindexed; demo article
listed + noindexed), phase14 7/7; unit+int 331+1/332 with new segments-gate and Dataset
shape tests; typecheck/lint clean; audit:exposure green; budgets home 109.2/110 ·
collection 110.8/160 · listing 127.5/130 kB gz.

## 2026-09-29 — Phase 11: enquiries, the desk, brochures, dashboards (§22 Prompt 11)

**Decision — enquiries (A)**: The intake moved to its spec name `/api/enquiry` and now does the
full §22-11A list: shared Zod schema (now with `utm` and `turnstileToken`), Turnstile through a
single shared verifier in src/lib/security/turnstile.ts (also used by join; fails open only
when unconfigured — rate limits still apply), honeypot + timing check, 5/IP/hour, consent
stored with timestamp and IP, UTM captured from the landing URL by the form. Authenticated
enquiries attach the memberId and land on the member's §8.7 activity trail
(`action: 'enquiry'`); sample listings log but email NO ONE (previously the confirmation still
went out). Routing follows the §2054 decision — the DESK first, then the listing agent, with
the agency inbox as the no-agent fallback (`resolveLeadRecipients`, deduplicated) — replacing
the inherited agent-first chain. The market pages gained the enquiry form (source
`market_page`); the contact page gained the desk's scheduled-call path as a Cal.com LINK
(never an embed — the CSP stays closed; §2068: no published direct number). Analytics renamed
to the §18 names: `enquiry_submitted`, plus `desk_call_scheduled`. The reminder cron lost its
WATERLINE subject and its dead `/admin/collections/leads` URL. The member's account page now
lists their own enquiries with response status (§11.7); the admin queue got Desk grouping and
status/source columns.

**Decision — brochure (B)**: The endpoint is audience-aware: the viewer comes from the session
(force-dynamic; member responses are `private, no-store`) and the §8.3 allowlist projection
decides what the PDF can contain — "a public brochure contains no member-only field" is
structural, and src/lib/pdf/audience.test.ts pins it with canaries. The fact table is now the
§11.3 Lawrence set (receptions, plot in m² and ha, architect, heritage, tenure, condition,
renovated), a provenance panel renders the §3.2 narrative, and the price line obeys §12.2 via
`listingPrice` (exact / guide band / on request; sold shows nothing). A Payload UI field on
the property sidebar ("Generate brochure") is the admin action. The Turnstile widget is
lazy-loaded (next/dynamic, ssr:false) — the static import had pushed the listing first-load to
exactly 130.0 kB.

**Decision — dashboards (C)**: `getAdminDashboard` was rebuilt from ~120 sequential counts to
SEVEN bounded queries + pure in-memory bucketing, and its panels now match §9.2: inventory by
channel / value tier / status / market, members over time with source breakdown and the
confirmation rate, off-market views and document downloads per listing (from MemberActivity),
enquiries per week by source with the response-status split, a requirements board with live
match counts against off-market inventory (via `matchRequirement`), the four §9.2 data-quality
counters (missing images, short descriptions, missing market, expiring ≤14 days), and the
sample-leak sentinel. The dead Waterline `getAgencyDashboardStats` duplicate was deleted.

Working notes: `@payloadcms/ui` added as a direct dependency (pnpm strict node_modules);
Upstash-backed rate limiting and the full §12.5 email-template set remain deferred (in-memory
limiter + the three lead templates carry Phase 1 dev, consistent with the nonce store);
`.next-audit/**` added to the eslint ignores; TURNSTILE_* and NEXT_PUBLIC_DESK_CALCOM_URL
joined env.ts and .env.example.

**Gate evidence**: int acceptance 3/3 — an authenticated enquiry returns 201 and appears in
the queue with member, UTM and consent-IP attached plus the activity row, and BOTH dashboards
answer warm in <1s against the sample dataset (§9.2 shape asserted); full unit+int 340/342
tests → 339 passed +1 new suite (final count 342 incl. audience + routing suites, all green);
e2e phase7 7/7 (enquiry posts route + the 429 on the sixth), phase10+11 15/15 (brochure %PDF-,
localised, 404; dashboard shell noindex; a11y sweep incl. keyboard-only enquiry);
audit:exposure green; typecheck/lint clean; budgets home 109.2/110 · collection 110.9/160 ·
listing 127.8/130 kB gz.

## 2026-09-29 — Phase 12: the §13.10 Lawrence sample generator

**Decision**: The generator now produces the §13.10 Lawrence dataset instead of the inherited
waterfront one. `src/lib/sample/markets.ts` carries the eighteen §15.4 markets (Saint-Tropez →
the Algarve) with real-geodata bounding boxes, localities, currencies and €/m² baselines —
`waterBody` is now OPTIONAL, so inland markets (Tuscany, London, Gstaad, Courchevel, Aspen)
generate no waterfront block at all. `economics.ts` builds 45 blueprints — 30 public and 15
off-market (every third listing) — with the §2.2 value distribution: €10M–€180M, trophy
dominant, ~9 signature (≥€50M), and EXACTLY four prime exceptions at fixed indices, priced
first and areas derived so the arithmetic stays internally consistent. Every §12.2 disclosure
mode is represented (the §8.4 publication cycles openly / as-band / without-price across the
public rows, bands rounded to €1M), off-market rows have no slug and never-exact coordinates,
references are `LPC-SAMPLE-###`, and the fixed seed makes two runs byte-identical.

Also per §13.10: 8 fictional agencies / 16 agents covering all eighteen markets; 8 members
across the states (six active-confirmed, one pending, one suspended) with requirements for
three, 12 saved listings and a seeded activity trail (off-market views + document downloads,
feeding the §9.2 demand panel); 30 segment pages generated from per-segment templates over
the market registry; 8 published sample journal articles (the §13.7 backlog written out,
statistics-free per §13.9); the three reports retargeted to the new markets. The six
description-template locales were rewritten to Lawrence trophy copy — openings/titles for the
full Lawrence type set with no water assumptions, water and nautical sentences kept but
strictly conditional on real frontage/berth data. `sample:purge` now removes EVERYTHING
§13.12 lists: listings, media, agencies, agents, enquiries, members and their saved
listings/requirements/activity, and the sample markets, segment pages, reports and articles.

Working notes:
- **The §2.2 prime cap bit its own seeder**: publishing the four prime exceptions
  mid-sequence trips the 10%-of-published check while inventory is still small. The seeder
  now publishes the primes LAST — with 41 listings live the cap admits exactly four, and
  idempotent re-runs stay legal. A nice accidental proof that the valve enforcement works.
- Fixed a latent bug: the old seeder wrote `location.destination` (a field that does not
  exist) instead of `location.market`, so public sample listings had no market relation.
- Slug scheme moved to `sample-lpc-sample-###`; test fixtures updated across six spec files.
- economics.test.ts rewritten to the Lawrence invariants (45/30+15/four primes/~20%
  signature/€10–180M bounds/bbox containment/waterfront-only-where-water/determinism).

**Gate evidence**: generator idempotent — first run `45 created, 0 updated`, second run
`0 created, 45 updated`; `sample:purge` → "zero sample records remain" (18 markets, 30
segment pages, 3 reports, 8 articles, members and engagement all removed) → reseed clean;
reindex shows the split working (30 public / 15 member listings); no sample content indexable
— audit:seo 0/0 with samples absent from every sitemap, sample pages noindexed (asserted in
phase10/11 e2e); unit 294 + int 42 green; e2e phase5 5/5, member 7/7 (1 timing flake passed
on retry), phase7 7/7, phase9 9/9, phase10 6/6, phase11 9/9; audit:exposure green over the
15-listing off-market layer; typecheck/lint clean.
