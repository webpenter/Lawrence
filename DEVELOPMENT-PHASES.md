# LAWRENCE PRIVATE COLLECTION — Complete Development Phases

## Track A — The Fast Launch (Prompts 1-14)

### Phase 1 — Scaffold and guardrails (Prompt 1)
**Goal**: Establish the rules, infrastructure, and CI before writing application code.
- Next.js 15 App Router + TypeScript strict
- Payload 3 embedded with Postgres adapter
- Zod-validated env module
- `docker-compose` with PostGIS and Typesense
- CI pipelines (Vitest, Playwright, axe, Lighthouse)
- Governance files: `CLAUDE.md`, `.cursor/rules/lawrence.mdc`, `DECISIONS.md`
**Gate**: `pnpm dev` boots; `/api/health` ok; CI green.

### Phase 2 — Tokens and components (Prompt 2)
**Goal**: Design system and component inventory based on §10.
- CSS variables from tokens in §10.2
- Tailwind v4 via `@theme`
- Typography (Cormorant Garamond, Inter)
- Component inventory in `/dev/styleguide` (OffMarketInvite, SaveButton, etc.)
**Gate**: `axe` reports zero violations; components keyboard reachable.

### Phase 3 — Property collection (Prompt 3)
**Goal**: Core `Property` Payload collection per §6.1-6.5.
- Multi-lingual fields (en, it, fr, de, es, ru)
- FX snapshot integration and `valueTier` logic
- Typesense synchronization hooks
- Live preview in Admin UI
**Gate**: Typesense routing works; validation blocks <€20M without prime override.

### Phase 4 — Remaining collections (Prompt 4)
**Goal**: Media, Document, Member, SavedListing, Requirement, MemberActivity, Enquiry, Market, Report, Article, Page, etc.
- Member auth (email + password / magic link)
- `MEMBER_REQUIRE_APPROVAL` support
- Media variants, EXIF stripping, signed URLs for private bucket
**Gate**: Member data isolated; private bucket URLs required.

### Phase 5 — The access layer (Prompt 5)
**Goal**: Strict viewer and visibility resolution per §8.1-8.3.
- Resolving the `Viewer`
- `canSee()` implementation
- Allowlist projections per audience
- `audit:exposure` script in CI
**Gate**: `audit:exposure` passes; table-driven tests pass.

### Phase 6 — Data layer, geo, search (Prompt 6)
**Goal**: `db`, `geo`, and `search` modules.
- `getListingBySlug`, `searchListings`, etc.
- PostGIS ST_DWithin helpers, deterministic jitter for public map circles
- Typesense collections (`public_listings`, `member_listings`)
- Postgres fallback path
**Gate**: Unit tests cover filter translation; exact coordinates never in public API.

### Phase 7 — i18n, currency, units (Prompt 7)
**Goal**: Localization per §5.1.
- `next-intl` (6 locales)
- CurrencySwitcher and UnitSwitcher
- `hreflang` helper
**Gate**: Locale switching works; no hardcoded user-facing strings.

### Phase 8 — Public Collection pages (Prompt 8)
**Goal**: Public facing routes per §11.1-11.3 and §12.1-12.2.
- Home, Collection browse, Listing detail
- Locality circle map, market context strip
- SSG + ISR, dynamic OG images
**Gate**: Lighthouse mobile ≥95; `audit:exposure` passes.

### Phase 9 — Membership and the Off-Market section (Prompt 9)
**Goal**: The private member experience (§8.5-8.8, §11.4).
- Join, login, TOTP
- `/off-market` routes (noindex, never cached)
- Member media/documents through `/api/secure/*`
- Account area, requirements profile, matching logic
**Gate**: Join flow E2E passes; anonymous requests to off-market return 404.

### Phase 10 — Market intelligence and the SEO engine (Prompt 10)
**Goal**: Content routes per §11.5, §11.6, §15.4.
- `/markets/*`, `/intelligence/*`, `/journal/*`
- SEO layer (canonical, sitemap index, robots.txt, JSON-LD)
- `/api/public/markets/[market]/stats` JSON endpoint
**Gate**: `audit:seo` clean; Rich Results passes.

### Phase 11 — Enquiries, desk, brochures, dashboards (Prompt 11)
**Goal**: Workflow and analytics.
- Enquiry forms (Turnstile, rate limiting, routing to Resend)
- Brochure PDF generation
- Admin dashboard and member dashboard
**Gate**: Dashboards load <1s; enquiries route to email.

### Phase 12 — Sample data and content production (Prompt 12)
**Goal**: Deterministic data generator (§13.10).
- 45 properties, 18 markets, 8 fictional agencies, 8 test members
- `sample:purge` command
**Gate**: Idempotent generator; no sample content is indexable.

### Phase 13 — Accessibility and performance passes (Prompt 13)
**Goal**: Final tuning (§14, §16).
- WCAG 2.2 AA (axe-core on 10 routes)
- Bundle analysis, cache headers, signed revalidation webhook
**Gate**: Zero axe violations; Lighthouse accessibility 100.

### Phase 14 — Security, tests, staging, launch, handover (Prompt 14)
**Goal**: Go-live readiness (§17, §19, §20).
- CSP, rate limits, Sentry with PII scrubbing
- Self-service account deletion
- Full E2E suite, `LAUNCH-CHECKLIST.md`
**Gate**: securityheaders.com grade A; CI fully green.

---

## Track B — Agency Accounts (Optional, Later)

### Phase 15 — Agency accounts and roles (Prompt 15)
- Reusable `tenant` access function
- Agency onboarding
- Agency dashboard
**Gate**: Agency B receives 403 on Agency A's listings.

### Phase 16 — Moderation and bulk import (Prompt 16)
- Review queue at `/admin/review`
- CSV/XLSX bulk import with dry-run validation
**Gate**: Import rejects duplicates and invalid prices.
