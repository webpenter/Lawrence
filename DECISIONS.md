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
