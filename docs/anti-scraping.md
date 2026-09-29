# LAWRENCE — Anti-Scraping & Asset Protection Policy (Spec §16.3)

Listing data and provenance and confidential listing data are LAWRENCE's core assets. This document specifies technical controls and operational policies designed to make automated scraping prohibitively costly without hindering legitimate search engine indexing or public web access.

---

## 1. Technical Anti-Scraping Controls

### 1.1 Strict Rate Limiting & Bot Protection
- **Edge Protection**: Cloudflare Web Application Firewall (WAF) rules monitor traffic spikes and challenge automated scraping bots using Managed Challenges.
- **Application Rate Limits**:
  - Lead submissions (`/api/leads`): **5 requests / IP / hour**.
  - Search API (`/api/search`): **60 requests / IP / minute**.
  - Admin/Action APIs: Token-bucket protected.

### 1.2 No Public Bulk JSON Endpoints
- Search and listings API endpoints strictly cap page sizes to a maximum of **60 items per response**.
- Requests specifying `limit=all` or un-bounded pagination parameters are rejected with HTTP 400.
- Bulk exports are accessible exclusively to authenticated administrators and agency account owners for their own listings.

### 1.3 Approximate Coordinate Protection (§6.6)
- Properties designated with `approximate_500m` water access or privacy bounds **never** expose exact geographic latitude and longitude over public endpoints or search indexes.
- Geographic coordinates are jittered up to 500 meters server-side before reaching client bundles or public search indices.

### 1.4 Unguessable Media & Asset URLs
- Uploaded property media and image variants utilize cryptographically random UUID hashes in object storage keys (`/media/orig_3f8a91b2c4...jpg`).
- Image directories do not permit directory listing (`IndexIgnore *`).

---

## 2. Terms of Service Prohibition Clause

LAWRENCE's Terms of Service explicitly prohibit unauthorized data extraction:

> "The extraction, scraping, harvesting, mining, or automated collection of listing data, property descriptions, provenance and confidential specifications, media, or price information from LAWRENCE by any automated script, spider, crawler, or bot (other than explicitly allowed search engine crawlers adhering to `robots.txt`) is strictly prohibited."

---

## 3. Allowed Search Engine Crawlers

The following legitimate web crawlers and AI search indexers are allowed via `robots.txt` on public listing and landing pages:
- Googlebot
- Bingbot
- GPTBot
- OAI-SearchBot
- PerplexityBot
- ClaudeBot
- Google-Extended

All crawlers are strictly excluded from `/admin`, `/api`, `/dev`, and search filter facet URLs.
