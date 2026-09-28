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
