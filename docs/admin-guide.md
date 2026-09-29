# LAWRENCE — Backoffice & Editorial Guide

A comprehensive guide for non-technical editors, agency administrators, and property agents managing listings on the LAWRENCE portal.

---

## 1. Accessing the Backoffice

- **URL**: `https://lawrenceprivatecollection.com/admin` (or `http://localhost:3000/admin` in development)
- **Sign In**: Use your registered agency or editorial credentials.
- **Roles & Permissions**:
  - **Portal Administrator (`admin`)**: Full platform control, moderation approvals, user/agency management, and platform analytics.
  - **Agency Administrator (`agency_admin`)**: Manage your agency's property listings, agent profiles, feed imports, and inbound client leads.
  - **Property Agent (`agency_agent`)**: Edit and view assigned property listings and client enquiries.

---

## 2. Listing Management & The Water Rule

LAWRENCE is the private portal for trophy property from **€20M** (with the €10–20M prime-exception track). The publishing gate is enforced by automated server-side validation.

### Publishing Requirements (Non-Negotiable)
To move a listing to `status = in_market` and publish it live, the following criteria must be satisfied:
1. **Water Access Type**: At least one valid access type must be selected (e.g. *Private Dock*, *Mooring Buoy*, *Direct Beachfront*, *Slipway*, *Riverfront Quay*).
2. **Distance to Water**: Must be **50 meters or less** (`distanceToWaterM <= 50`).
3. **Nautical Specifications** (for berth listings): If the property includes a berth, enter maximum Boat LOA, Draft, Beam, and Bridge Clearance.
4. **Media & Photography**: Upload high-resolution photography (at least 1600px wide). The system automatically generates 6 optimized image variants and WebP/AVIF formats.

---

## 3. Agency Import & Feed Workflows

Agencies can onboard inventory through three supported routes:

1. **Manual Entry**: Click **Properties** → **Create New** in the sidebar. Fill in property specifications, nautical details, pricing, and upload media.
2. **Bulk CSV Import**:
   - Navigate to **Agency Dashboard** → **Bulk Import**.
   - Download the official CSV template.
   - Upload your prepared CSV.
   - Review the **Dry-Run Validation Report** showing invalid rows, coordinate errors, or missing water criteria before confirming import.
3. **Automated XML/JSON Feed**:
   - Provide your Kyero XML or generic JSON feed endpoint URL to portal admins.
   - Feeds are automatically ingested and verified every 6 hours (`/api/cron/poll-feeds`).
   - Deduplication prevents duplicate listings across multiple agencies.

---

## 4. Moderation & Listing Quality Control

All agency-submitted listings enter the **Moderation Queue** (`moderation = unreviewed`):
- **Automated Pre-Checks**: The portal runs automated checks for coordinate validity, price anomalies, image resolutions, and descriptions.
- **Approval**: Portal editors review pending listings and click **Approve** to make them publicly visible in search and sitemaps.
- **Rejection**: If a listing does not satisfy the 50m water access rule, editors reject with feedback to the agency.

---

## 5. Inbound Leads & GDPR Privacy Erasure

### Lead Workflow
1. When an enquirer submits an enquiry on a property detail page, a notification is immediately emailed to the assigned agent.
2. The lead appears in **Leads** in the admin panel with contact details, source attribution, and consent timestamp.
3. If an enquiry remains unacknowledged after 48 hours, an automated reminder is sent to the agency admin.

### One-Click GDPR Erasure
If a client requests data erasure under GDPR Article 17:
1. Open the lead record in the admin panel.
2. Click the **Anonymize Lead (GDPR)** action.
3. The lead's personal data (name, email, phone, message, IP) is immediately scrubbed and replaced with anonymized tokens.
4. An entry is permanently recorded in the Audit Log for compliance verification.

---

## 6. Property PDF Brochure Generation

High-quality PDF brochures are generated on-the-fly for every approved listing:
- Link format: `/api/property/<slug>/brochure.pdf?locale=en`
- Includes property specs, water credentials, nautical dimensions, high-resolution photography, and agency branding.
