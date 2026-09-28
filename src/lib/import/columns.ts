/**
 * The §9.4 bulk-import column set. `required` marks the * columns.
 * The template download and the dry-run validator both derive from this table
 * so they can never drift apart.
 */

export interface ColumnSpec {
  name: string;
  required: boolean;
  kind: 'text' | 'number' | 'int' | 'bool' | 'enum' | 'multi-enum' | 'date' | 'urls';
  enumValues?: readonly string[];
}

import {
  CONDITIONS,
  COORDINATE_PRECISIONS,
  CURRENCIES,
  FEATURES,
  HERITAGE_STATUSES,
  MOORING_TYPES,
  OWNERSHIP_STRUCTURES,
  PRICE_TYPES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  PUBLIC_GEOGRAPHIES,
  SALE_STRUCTURES,
  TENURES,
  WATER_BODY_TYPES,
} from '@/collections/Property/enums';

export const IMPORT_COLUMNS: ColumnSpec[] = [
  { name: 'reference', required: true, kind: 'text' },
  { name: 'title_en', required: true, kind: 'text' },
  { name: 'description_en', required: true, kind: 'text' },
  { name: 'property_type', required: true, kind: 'enum', enumValues: PROPERTY_TYPES },
  { name: 'status', required: true, kind: 'enum', enumValues: PROPERTY_STATUSES },
  { name: 'price_type', required: true, kind: 'enum', enumValues: PRICE_TYPES },
  { name: 'price_amount', required: false, kind: 'number' },
  { name: 'price_band_min', required: false, kind: 'number' },
  { name: 'price_band_max', required: false, kind: 'number' },
  { name: 'internal_value_eur', required: false, kind: 'number' },
  { name: 'currency', required: true, kind: 'enum', enumValues: CURRENCIES },
  { name: 'tenure', required: false, kind: 'enum', enumValues: TENURES },
  { name: 'ownership_structure', required: false, kind: 'enum', enumValues: OWNERSHIP_STRUCTURES },
  { name: 'sale_structure', required: false, kind: 'enum', enumValues: SALE_STRUCTURES },
  { name: 'bedrooms', required: true, kind: 'int' },
  { name: 'bathrooms', required: true, kind: 'int' },
  { name: 'built_area_sqm', required: true, kind: 'number' },
  { name: 'plot_area_sqm', required: false, kind: 'number' },
  { name: 'year_built', required: false, kind: 'int' },
  { name: 'condition', required: false, kind: 'enum', enumValues: CONDITIONS },
  { name: 'heritage_status', required: false, kind: 'enum', enumValues: HERITAGE_STATUSES },
  { name: 'architect', required: false, kind: 'text' },
  { name: 'water_access', required: false, kind: 'bool' },
  { name: 'water_body_type', required: false, kind: 'enum', enumValues: WATER_BODY_TYPES },
  { name: 'water_frontage_m', required: false, kind: 'number' },
  { name: 'mooring_type', required: false, kind: 'enum', enumValues: MOORING_TYPES },
  { name: 'berth_count', required: false, kind: 'int' },
  { name: 'max_boat_loa_m', required: false, kind: 'number' },
  { name: 'country', required: true, kind: 'text' },
  { name: 'region', required: false, kind: 'text' },
  { name: 'province', required: false, kind: 'text' },
  { name: 'locality', required: true, kind: 'text' },
  { name: 'address_line', required: false, kind: 'text' },
  { name: 'latitude', required: true, kind: 'number' },
  { name: 'longitude', required: true, kind: 'number' },
  { name: 'coordinate_precision', required: false, kind: 'enum', enumValues: COORDINATE_PRECISIONS },
  { name: 'public_geography', required: false, kind: 'enum', enumValues: PUBLIC_GEOGRAPHIES },
  { name: 'features', required: false, kind: 'multi-enum', enumValues: FEATURES },
  { name: 'image_urls', required: true, kind: 'urls' },
  { name: 'agent_email', required: false, kind: 'text' },
  { name: 'video_url', required: false, kind: 'text' },
  { name: 'virtual_tour_url', required: false, kind: 'text' },
];

export const COLUMN_BY_NAME = new Map(IMPORT_COLUMNS.map((c) => [c.name, c]));
