import type { CollectionConfig } from 'payload';

import { adminOnly, anyLoggedIn, staffOnlyFieldAccess, tenant } from '@/payload/access/tenant';

import {
  CHANNELS,
  CONDITIONS,
  COORDINATE_PRECISIONS,
  CURRENCIES,
  FEATURES,
  HERITAGE_STATUSES,
  MANDATE_TYPES,
  MODERATION_STATES,
  MOORING_TYPES,
  OWNERSHIP_STRUCTURES,
  PRICE_DISCLOSURES,
  PRICE_TYPES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  PUBLIC_GEOGRAPHIES,
  SALE_STRUCTURES,
  SOURCE_TYPES,
  TENURES,
  VALUE_TIERS,
  WATER_BODY_TYPES,
} from './enums';
import {
  applyPublicationControl,
  cleanupAfterDelete,
  computeDerivedFields,
  enforceAdmission,
  sanitizeAgencySubmission,
  syncAfterChange,
} from './hooks';

/** §8.4 — the single required publication control. */
const PUBLICATIONS = [
  'published_openly',
  'published_without_price',
  'published_as_band',
  'off_market',
] as const;

const staffOnlyField = {
  read: staffOnlyFieldAccess,
  update: staffOnlyFieldAccess,
};

export const Property: CollectionConfig = {
  slug: 'properties',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'channel', 'valueTier', 'status', 'agency', 'priceEur'],
    description:
      'Lawrence lists property from €20M (€10–20M only on the prime exception track, an admin decision). Off-market listings never have a slug, never appear in sitemaps, feeds or the public search collection.',
    livePreview: {
      url: ({ data }) =>
        data?.channel === 'off_market'
          ? `/en/off-market/${data?.id ?? ''}`
          : `/en/property/${data?.slug ?? ''}`,
    },
  },
  access: {
    // §8.1: staff see all; agency roles (Track B) are scoped by tenant().
    read: tenant({ agentField: 'agent' }),
    create: anyLoggedIn,
    update: tenant({ agentField: 'agent' }),
    delete: adminOnly,
  },
  versions: {
    drafts: { autosave: true },
    maxPerDoc: 25,
  },
  hooks: {
    beforeValidate: [applyPublicationControl, enforceAdmission],
    beforeChange: [sanitizeAgencySubmission, computeDerivedFields],
    afterChange: [syncAfterChange],
    afterDelete: [cleanupAfterDelete],
  },
  indexes: [
    // The hot public query (§6.8): channel + status + isSample.
    { fields: ['channel', 'status', 'isSample'] },
    // Agency's own listing reference, unique within that agency.
    { fields: ['agency', 'reference'], unique: true },
  ],
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Essentials',
          fields: [
            { name: 'title', type: 'text', required: true, localized: true },
            { name: 'subtitle', type: 'text', localized: true },
            {
              name: 'reference',
              type: 'text',
              admin: { description: "The agency's own listing code. Unique per agency." },
            },
            {
              name: 'propertyType',
              type: 'select',
              required: true,
              index: true,
              options: [...PROPERTY_TYPES],
            },
            { name: 'availableFrom', type: 'date' },
          ],
        },
        {
          label: 'Commercial',
          description: 'Price per §6.2. internalValueEur is the enforcement value and never leaves the CMS.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'priceType',
                  type: 'select',
                  required: true,
                  defaultValue: 'fixed',
                  options: [...PRICE_TYPES],
                },
                {
                  name: 'priceAmount',
                  type: 'number',
                  min: 0,
                  admin: { condition: (data) => data?.priceType !== 'price_band' },
                },
                {
                  name: 'currency',
                  type: 'select',
                  required: true,
                  defaultValue: 'EUR',
                  options: [...CURRENCIES],
                },
              ],
            },
            {
              type: 'row',
              admin: { condition: (data) => data?.priceType === 'price_band' },
              fields: [
                { name: 'priceBandMin', type: 'number', min: 0 },
                { name: 'priceBandMax', type: 'number', min: 0 },
              ],
            },
            {
              name: 'internalValueEur',
              type: 'number',
              min: 0,
              access: staffOnlyField,
              admin: {
                description:
                  'Admin-only, never serialised to any audience. Required to publish a listing without an exact public price — the €20M threshold is enforced on it.',
              },
            },
            {
              type: 'row',
              fields: [
                { name: 'tenure', type: 'select', options: [...TENURES] },
                { name: 'ownershipStructure', type: 'select', options: [...OWNERSHIP_STRUCTURES] },
                { name: 'saleStructure', type: 'select', options: [...SALE_STRUCTURES] },
              ],
            },
            {
              name: 'annualRunningCostEur',
              type: 'number',
              min: 0,
              admin: { description: 'Members-only extra (§8.3).' },
            },
            {
              name: 'taxNotes',
              type: 'richText',
              localized: true,
              admin: { description: 'Factual, sourced — never advice.' },
            },
            {
              type: 'row',
              fields: [
                { name: 'mandateType', type: 'select', options: [...MANDATE_TYPES] },
                {
                  name: 'commissionTerms',
                  type: 'text',
                  access: staffOnlyField,
                  admin: { description: 'Staff-only.' },
                },
              ],
            },
          ],
        },
        {
          label: 'Physical & provenance',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'bedrooms', type: 'number', min: 0 },
                { name: 'bathrooms', type: 'number', min: 0 },
                { name: 'receptionRooms', type: 'number', min: 0 },
                { name: 'staffAccommodation', type: 'number', min: 0 },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'builtAreaSqm', type: 'number', min: 0 },
                { name: 'plotAreaSqm', type: 'number', min: 0 },
                { name: 'plotAreaHa', type: 'number', min: 0 },
                { name: 'terraceAreaSqm', type: 'number', min: 0 },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'floors', type: 'number', min: 0 },
                { name: 'yearBuilt', type: 'number' },
                { name: 'renovatedYear', type: 'number' },
                { name: 'parkingSpaces', type: 'number', min: 0 },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'architect', type: 'text' },
                {
                  name: 'heritageStatus',
                  type: 'select',
                  defaultValue: 'none',
                  options: [...HERITAGE_STATUSES],
                },
                { name: 'condition', type: 'select', options: [...CONDITIONS] },
                { name: 'energyRating', type: 'text' },
              ],
            },
            {
              name: 'provenance',
              type: 'richText',
              localized: true,
              admin: {
                description: 'How a €60M estate is narrated — history, architecture, land (§3.2).',
              },
            },
            {
              name: 'features',
              type: 'select',
              hasMany: true,
              options: [...FEATURES],
            },
            {
              name: 'waterfront',
              type: 'group',
              admin: {
                description:
                  'Optional §6.3 sub-block — valuable at this level, and the bridge to the sister portal.',
              },
              fields: [
                { name: 'waterAccess', type: 'checkbox', defaultValue: false },
                { name: 'waterBodyType', type: 'select', options: [...WATER_BODY_TYPES] },
                { name: 'waterFrontageM', type: 'number', min: 0 },
                { name: 'mooringType', type: 'select', options: [...MOORING_TYPES] },
                { name: 'maxBoatLoaM', type: 'number', min: 0 },
                { name: 'berthCount', type: 'number', min: 0 },
              ],
            },
          ],
        },
        {
          label: 'Location',
          description:
            '§6.4 disclosure control: the serialiser shows each audience an allowlist, never a denylist.',
          fields: [
            {
              name: 'location',
              type: 'group',
              fields: [
                {
                  name: 'label',
                  type: 'text',
                  admin: { description: 'Audience-aware display string, e.g. "Cap Ferrat, Côte d\'Azur".' },
                },
                {
                  name: 'addressLine',
                  type: 'text',
                  access: staffOnlyField,
                  admin: { description: 'Staff-only. Never serialised to any audience.' },
                },
                { name: 'locality', type: 'text' },
                { name: 'province', type: 'text' },
                { name: 'region', type: 'text' },
                {
                  name: 'country',
                  type: 'text',
                  index: true,
                  maxLength: 2,
                  admin: { description: 'ISO-3166-1 alpha-2, e.g. IT, FR, US.' },
                },
                { name: 'continent', type: 'text' },
                {
                  name: 'destination',
                  type: 'relationship',
                  relationTo: 'destinations',
                  index: true,
                  admin: { description: 'The Market this listing belongs to (renamed in Prompt 4).' },
                },
                { name: 'coordinates', type: 'point', index: true },
                {
                  name: 'coordinatePrecision',
                  type: 'select',
                  defaultValue: 'approximate_500m',
                  options: [...COORDINATE_PRECISIONS],
                  admin: {
                    description:
                      'Exact pins only where the seller permits (§4.8). approximate_500m renders a jittered circle publicly; locality_only sends no coordinates at all.',
                  },
                },
                {
                  name: 'publicGeography',
                  type: 'select',
                  defaultValue: 'locality',
                  options: [...PUBLIC_GEOGRAPHIES],
                  admin: {
                    description: 'The coarsest truthful label shown to anonymous visitors.',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Media & content',
          fields: [
            {
              name: 'media',
              type: 'relationship',
              relationTo: 'media',
              hasMany: true,
              admin: { description: 'Ordered. The first image is the hero and card image.' },
            },
            { name: 'videoUrl', type: 'text' },
            { name: 'virtualTourUrl', type: 'text' },
            {
              name: 'floorplans',
              type: 'relationship',
              relationTo: 'media',
              hasMany: true,
              admin: { description: 'Members-only by default (§6.5).' },
            },
            {
              name: 'documents',
              type: 'relationship',
              relationTo: 'media',
              hasMany: true,
              admin: { description: 'Private — staff and owning agency only. Never public.' },
            },
            { name: 'description', type: 'richText', localized: true },
            {
              name: 'highlights',
              type: 'array',
              localized: true,
              maxRows: 5,
              fields: [{ name: 'text', type: 'text', required: true }],
            },
            { name: 'metaTitle', type: 'text', localized: true },
            { name: 'metaDescription', type: 'textarea', localized: true },
          ],
        },
      ],
    },

    // ---- Sidebar: publication, identity, lifecycle (§6.1, §8.4) ----
    {
      name: 'publication',
      type: 'select',
      required: true,
      defaultValue: 'published_openly',
      options: [...PUBLICATIONS],
      admin: {
        position: 'sidebar',
        description:
          '"How should this property be published?" — the one required control (§8.4). It sets channel and price disclosure.',
      },
    },
    {
      name: 'channel',
      type: 'select',
      required: true,
      defaultValue: 'public',
      index: true,
      options: [...CHANNELS],
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Derived from the publication control — the single routing decision.',
      },
    },
    {
      name: 'priceDisclosure',
      type: 'select',
      required: true,
      defaultValue: 'exact',
      index: true,
      options: [...PRICE_DISCLOSURES],
      admin: {
        position: 'sidebar',
        description:
          'Derived for public listings; for off-market listings members see exact or band (§8.3).',
      },
    },
    {
      name: 'valueTier',
      type: 'select',
      index: true,
      options: [...VALUE_TIERS],
      admin: {
        position: 'sidebar',
        description:
          'trophy/signature derive from the EUR value automatically. prime (€10–20M) is an explicit admin decision, capped at 10% of published inventory.',
      },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'Generated on first publish; always null for off-market listings (addressed by id). Changes create a Redirect.',
      },
    },
    {
      name: 'agency',
      type: 'relationship',
      relationTo: 'agencies',
      required: true,
      index: true,
      admin: { position: 'sidebar', description: 'Multi-tenancy key. Every query is scoped by it.' },
    },
    {
      name: 'agent',
      type: 'relationship',
      relationTo: 'agents',
      admin: { position: 'sidebar', description: 'Enquiry routing target.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [...PROPERTY_STATUSES],
      // Distinct DB enum name: the collection also has drafts (`_status`),
      // and Payload otherwise derives `enum_properties_status` for BOTH this
      // field and `_status`, colliding so drafts' draft/published wins and
      // this field's values are dropped. The Payload API still uses `status`.
      dbName: 'listing_status',
      admin: { position: 'sidebar' },
    },
    {
      name: 'moderation',
      type: 'select',
      required: true,
      defaultValue: 'unreviewed',
      index: true,
      options: [...MODERATION_STATES],
      admin: { position: 'sidebar', description: 'Dormant in Phase 1; Track B turns the queue on.' },
    },
    {
      name: 'moderationNote',
      type: 'textarea',
      admin: { position: 'sidebar', description: 'Shown to the submitter. Not public.' },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar', description: 'Editorial only. Agencies cannot self-feature.' },
    },
    {
      name: 'isSample',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar', description: 'Demo data: SAMPLE badge, noindex, out of sitemaps.' },
    },
    {
      name: 'priceEur',
      type: 'number',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Computed from the daily FX snapshot. The only field used for price sorting/filtering.',
      },
    },
    {
      name: 'priceBandMinEur',
      type: 'number',
      admin: { position: 'sidebar', readOnly: true, hidden: true },
    },
    {
      name: 'priceBandMaxEur',
      type: 'number',
      admin: { position: 'sidebar', readOnly: true, hidden: true },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'expiresAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'publishedAt + 120 days unless availability is reconfirmed (§9.3).',
      },
    },
    {
      name: 'lastVerifiedAt',
      type: 'date',
      admin: { position: 'sidebar', description: 'Set when availability is confirmed still current.' },
    },
    {
      name: 'expiryReminderSentAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'When the §9.3 T-14 confirmation email last went out.',
      },
    },
    {
      name: 'sourceType',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: [...SOURCE_TYPES],
      admin: { position: 'sidebar' },
    },
    {
      name: 'duplicateOf',
      type: 'relationship',
      relationTo: 'properties',
      admin: { position: 'sidebar', description: 'Set by duplicate detection (§6.1).' },
    },
    {
      name: 'fingerprint',
      type: 'text',
      index: true,
      admin: { position: 'sidebar', readOnly: true },
    },
    { name: 'viewCount', type: 'number', defaultValue: 0, admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'memberViewCount',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', readOnly: true, description: 'Off-market views counted separately (§6.1).' },
    },
    {
      name: 'enquiryCount',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
};
