# LAWRENCE — Privacy & GDPR Procedures (Spec §16.4 & §16.5)

This document outlines LAWRENCE's data protection, subject access procedures, data retention schedules, and Data Processing Agreements (DPAs).

---

## 1. Data Protection & Processing Register

LAWRENCE collects and processes personal data strictly necessary to facilitate real estate enquiries for trophy properties:

- **Enquirer Data**: Full name, email address, phone number, personal message, IP address, consent timestamp.
- **Agency / Agent Data**: Business email address, phone number, name, assigned listings.
- **Analytics Data**: Anonymized user interaction events (pageviews, search filters, boat dimension checks) via Plausible Analytics (no personal identifiers or cross-site tracking).

---

## 2. Subject Access Request (SAR) Procedure

Under GDPR Article 15, data subjects have the right to request access to their personal data stored by LAWRENCE.

### Procedure for Data Protection Officers (DPO):
1. **Verification**: Verify the identity of the requesting individual via email confirmation from the registered address.
2. **Search**: Search the `Leads`, `ConsentRecords`, and `Users` collections using the subject's email address.
3. **Export**: Export matching records into a structured JSON/CSV report excluding internal system metadata.
4. **Delivery**: Securely deliver the report within 30 calendar days.

---

## 3. Right to Erasure & One-Click Anonymization (§16.4)

Under GDPR Article 17, individuals can request erasure of their personal data.

### One-Click Admin Action:
In the Payload backoffice (or via the administrative API endpoint `/api/admin/anonymize-lead`), administrators can anonymize any lead in one click:
- `name` is replaced with `[ANONYMIZED]`.
- `email` is replaced with `anonymized-{id}@privacy.lawrence.internal`.
- `phone` is deleted (`undefined`).
- `message` is replaced with `[ANONYMIZED_PER_GDPR_REQUEST]`.
- `consentIp` is replaced with `[ANONYMIZED]`.
- All marketing consent toggles are disabled.
- **Preservation**: The lead record itself, property association, agency association, locale, source, and creation timestamp are preserved for market statistics.

---

## 4. Data Retention Schedule (§16.5)

LAWRENCE automatically enforces data retention limits via scheduled retention sweeps (`/api/cron/retention`):

| Data Category | Retention Period | Action Upon Expiry |
| --- | --- | --- |
| **Active Enquiries / Leads** | 24 Months | Automatically anonymized (PII scrubbed, metadata preserved). |
| **Import Files / Temporary Feed Logs** | 90 Days | Automatically deleted from storage. |
| **Audit Logs** | 24 Months | Automatically purged. |
| **Analytics Data** | Aggregated only | Retained indefinitely as aggregate metrics (zero PII). |
| **Sold Property Listings** | Indefinite | Retained as historical market data; associated enquirer PII scrubbed. |

---

## 5. Vendor Data Processing Agreements (DPAs)

LAWRENCE maintains DPAs with the following sub-processors:

- **Vercel Inc.**: Application Hosting & Edge Runtime (US/EU Data Privacy Framework).
- **Neon Inc.**: Managed PostgreSQL Database (EU region Frankfurt/Dublin).
- **Typesense Cloud**: Search Index Infrastructure (EU region).
- **Cloudflare Inc.**: CDN, Media Hosting (R2), and WAF Security.
- **Resend Inc.**: Transactional Email Delivery.
- **Plausible Analytics**: Privacy-focused Analytics (EU-hosted, cookie-less).
- **Sentry (Functional Software Inc.)**: Error Monitoring with automatic server-side PII scrubbing.
