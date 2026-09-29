# Handover screen recording — 10-minute script (Prompt 20)

Record against **staging** with demo inventory seeded (`pnpm seed`). One
take per chapter is fine; keep the cursor slow. Total target: 10 minutes.

## 0:00 — Intro (30 s)
"This is the LAWRENCE backoffice. Five things in ten minutes: publish a
listing, import a CSV, approve a listing, read the dashboard, add a landing
page." Show the `/admin` login (mention 2FA prompt).

## 0:30 — Publish a listing (2 min 30)
1. Properties → Create. Fill title, agency, destination, price.
2. Pause on the **water fields**: pick a `waterAccessType`, set
   `distanceToWaterM` to 40 — then set it to 80 and hit Publish to show the
   validation refuse. "This is the water rule — the platform will not
   publish a listing further than 50 metres from the water." Set back to 40.
3. Add frontage, a berth with LOA/draft, photos. Publish.
4. Open the public page: point at the water credentials table, the badge,
   and the brochure PDF link. "Everything you typed is structured data —
   filters, badges and the brochure all read from these fields."

## 3:00 — Import a CSV (2 min)
1. Backoffice → Import. Upload `docs/templates/import-sample.csv` (or any
   agency file).
2. Run **dry-run** first: show the per-row error report ("row 7: missing
   waterAccessType — nothing was written").
3. Fix the row, re-upload, run for real. Show the created drafts with
   `moderation: unreviewed` and the pre-check notes.

## 5:00 — Approve a listing (1 min 30)
1. Properties → filter `moderation = unreviewed`.
2. Open one: read the pre-check note (coordinate sanity, price outlier).
3. Set moderation to approved, publish. "Two people, four eyes: importers
   never publish; editors approve."

## 6:30 — Read the dashboard (2 min)
1. Open `/en/dashboard` as an agency user: listings by status, the
   needs-attention list ("missing frontage" links straight to the record),
   leads (30 days), average response time.
2. Switch to an admin user: leads-per-week chart, data-quality counters,
   agency leaderboard, and the sample-leak banner ("if this is red at
   launch, stop the launch").

## 8:30 — Add a landing page (1 min 30)
1. Landing Pages → Create: title, canonical slug, combo filters.
2. Paste a prepared 300-word intro (open with the 40–60-word direct
   answer), add two FAQ entries, publish.
3. Open `/en/waterfront/<slug>`: stats strip, listing strip, FAQ accordion.
   "Publishing is the only step — sitemaps, JSON-LD and sibling links are
   automatic. The copy rules live in docs/seo-playbook.md."

## Close (10:00)
"Runbooks are in docs/runbooks, the launch gate is LAUNCH-CHECKLIST.md, and
anything unusual you find will already be explained in DECISIONS.md."
