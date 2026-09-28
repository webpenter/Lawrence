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
