/**
 * Built-in legal documents (§16.4: privacy, cookie and terms pages live
 * before launch; §16.3: the scraping prohibition is stated in the Terms).
 *
 * These are the shipped defaults: factual descriptions of what the platform
 * actually does (mirroring docs/privacy-procedures.md), each flagged for
 * review by counsel before launch. Editors can supersede any of them by
 * publishing a Page with the same slug — the CMS version then wins.
 * English-only by §13.9: legal text is never machine-translated; localized
 * versions are a counsel deliverable.
 */

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  slug: 'privacy' | 'cookies' | 'terms';
  title: string;
  description: string;
  reviewNote: string;
  sections: LegalSection[];
}

const REVIEW_NOTE =
  'This document describes how the platform actually operates and stands in until reviewed and finalised by legal counsel before public launch.';

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    description:
      'What personal data WATERLINE processes, why, for how long, and the rights you can exercise.',
    reviewNote: REVIEW_NOTE,
    sections: [
      {
        heading: 'What we collect',
        paragraphs: [
          'When you send an enquiry we process the details you give us — your name, email address, optional phone number and your message — together with the listing you asked about, your language preference, and a record of your consent (including a timestamp and the IP address the consent was given from).',
          'When an agency lists with us we process business contact details: company name, business email addresses and phone numbers, and the listings the agency publishes.',
          'Site analytics, where you consent to them, are cookieless and aggregate (Plausible); they contain no personal identifiers.',
        ],
      },
      {
        heading: 'Why we process it',
        paragraphs: [
          'Enquiry data exists for one purpose: to pass your enquiry to the listing agency so it can reply to you directly. The agency receives your name, email, phone number and message, and becomes an independent controller of that data when it replies.',
          'We do not sell personal data, run advertising profiles, or share enquiry data with anyone other than the listing agency you contacted.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: [
          'Enquiries are retained for 24 months from submission, then automatically anonymised: name, email, phone, message and consent IP are irreversibly replaced while aggregate statistics (listing, month, language) are kept.',
          'Import job files are deleted after 90 days. Audit log entries are deleted after 24 months. Records of sold properties are retained as market data with all enquirer data purged.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'You may request access to, correction of, or erasure of your personal data at any time by writing to the contact address in the footer. Erasure requests are honoured through a one-step anonymisation of your enquiry records; the documented procedure and its timelines are described in our subject-access procedure.',
          'You may withdraw analytics consent at any time via the cookie settings; withdrawal stops analytics immediately.',
        ],
      },
    ],
  },
  {
    slug: 'cookies',
    title: 'Cookie Policy',
    description:
      'The complete list of cookies WATERLINE sets, what each one does, how long it lives, and how analytics stays off until you explicitly consent to it.',
    reviewNote: REVIEW_NOTE,
    sections: [
      {
        heading: 'Cookies we set',
        paragraphs: [
          'lpc_consent — records your cookie decision itself (necessary; kept for one year).',
          'lpc_currency and lpc_units — remember your display currency and measurement units (necessary for the preference you chose; kept for one year).',
          'Payload session cookies — set only when an agency or editor signs in to the backoffice; never set for visitors.',
        ],
      },
      {
        heading: 'Analytics',
        paragraphs: [
          'With your consent we load Plausible, a cookieless analytics service: it sets no cookies and stores no personal identifiers. Without your consent it is never loaded.',
          'We set no advertising or cross-site tracking cookies of any kind.',
        ],
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms of Use',
    description:
      'The conditions for using WATERLINE and its listing data — including the prohibition on scraping and bulk extraction, and how sample content is marked.',
    reviewNote: REVIEW_NOTE,
    sections: [
      {
        heading: 'Use of the site',
        paragraphs: [
          'WATERLINE is an advertising platform for waterfront property. Listing content is provided by the listing agencies; measurements, berth dimensions and shoreline rights are indicative and must be verified independently before any transaction.',
          'Enquiries are forwarded to the listing agency, which replies directly and is responsible for the accuracy of its listings.',
        ],
      },
      {
        heading: 'Prohibition on scraping and bulk extraction',
        paragraphs: [
          'The listing database, including water-access credentials, berth data, imagery and descriptions, is the property of WATERLINE and its listing agencies. Automated scraping, harvesting, bulk downloading, or systematic extraction of listings or any substantial part of the database is prohibited, whether performed directly or through an intermediary, and regardless of method.',
          'Search-engine and AI-assistant crawlers honouring robots.txt are welcome on public content. All other automated access requires prior written permission.',
          'We rate-limit, challenge and block clients that violate this prohibition, and reserve all further remedies, including under database-right and contract law.',
        ],
      },
      {
        heading: 'Sample content',
        paragraphs: [
          'Listings and articles marked SAMPLE are demonstration data: they describe no real property and carry no offer. They are excluded from search-engine indexes.',
        ],
      },
    ],
  },
];

export function findLegalDocument(slug: string): LegalDocument | null {
  return LEGAL_DOCUMENTS.find((doc) => doc.slug === slug) ?? null;
}
