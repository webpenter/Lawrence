import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'it', 'fr', 'de', 'es', 'ru');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor', 'agency_admin', 'agency_agent');
  CREATE TYPE "public"."enum_members_preferred_locale" AS ENUM('en', 'it', 'fr', 'de', 'es', 'ru');
  CREATE TYPE "public"."enum_members_member_type" AS ENUM('buyer', 'advisor', 'broker', 'developer', 'other');
  CREATE TYPE "public"."enum_members_status" AS ENUM('active', 'pending', 'suspended');
  CREATE TYPE "public"."enum_members_source" AS ENUM('organic', 'off_market_cta', 'report_download', 'enquiry', 'referral');
  CREATE TYPE "public"."enum_media_visibility" AS ENUM('public', 'members');
  CREATE TYPE "public"."enum_documents_document_type" AS ENUM('floor_plan', 'brochure', 'inventory', 'survey', 'report_pdf', 'other');
  CREATE TYPE "public"."enum_properties_features" AS ENUM('pool', 'indoor_pool', 'spa', 'gym', 'cinema', 'wine_cellar', 'ballroom', 'library', 'chapel', 'helipad', 'tennis', 'padel', 'golf_hole', 'equestrian', 'vineyard', 'olive_grove', 'beach', 'private_dock', 'marina_berth', 'ski_in_ski_out', 'gatehouse', 'staff_quarters', 'guest_houses', 'generator', 'geothermal', 'solar', 'smart_home', 'car_gallery', 'panic_room');
  CREATE TYPE "public"."enum_properties_property_type" AS ENUM('villa', 'estate', 'penthouse', 'townhouse', 'chalet', 'castle', 'palazzo', 'private_island', 'vineyard_estate', 'equestrian_estate', 'hotel_resort', 'development_site', 'apartment', 'lodge', 'ranch');
  CREATE TYPE "public"."enum_properties_price_type" AS ENUM('fixed', 'on_request', 'price_band', 'auction');
  CREATE TYPE "public"."enum_properties_currency" AS ENUM('EUR', 'USD', 'GBP', 'CHF', 'AED', 'SGD', 'HKD');
  CREATE TYPE "public"."enum_properties_tenure" AS ENUM('freehold', 'leasehold', 'usufruct', 'concession');
  CREATE TYPE "public"."enum_properties_ownership_structure" AS ENUM('direct', 'spv', 'trust', 'foundation', 'company');
  CREATE TYPE "public"."enum_properties_sale_structure" AS ENUM('asset_sale', 'share_transfer', 'fractional', 'auction');
  CREATE TYPE "public"."enum_properties_mandate_type" AS ENUM('exclusive', 'open', 'introduction_only');
  CREATE TYPE "public"."enum_properties_heritage_status" AS ENUM('none', 'listed', 'protected', 'unesco_area');
  CREATE TYPE "public"."enum_properties_condition" AS ENUM('new', 'renovated', 'good', 'to_renovate', 'shell');
  CREATE TYPE "public"."enum_properties_waterfront_water_body_type" AS ENUM('sea', 'ocean', 'lake', 'river', 'lagoon', 'canal', 'fjord', 'bay', 'estuary');
  CREATE TYPE "public"."enum_properties_waterfront_mooring_type" AS ENUM('none', 'buoy', 'jetty', 'pontoon', 'fixed_dock', 'floating_dock', 'boat_lift', 'marina_berth');
  CREATE TYPE "public"."enum_properties_location_coordinate_precision" AS ENUM('exact', 'approximate_500m', 'locality_only');
  CREATE TYPE "public"."enum_properties_location_public_geography" AS ENUM('country', 'region', 'market', 'locality');
  CREATE TYPE "public"."enum_properties_publication" AS ENUM('published_openly', 'published_without_price', 'published_as_band', 'off_market');
  CREATE TYPE "public"."enum_properties_channel" AS ENUM('public', 'off_market');
  CREATE TYPE "public"."enum_properties_price_disclosure" AS ENUM('exact', 'band', 'on_request');
  CREATE TYPE "public"."enum_properties_value_tier" AS ENUM('prime', 'trophy', 'signature');
  CREATE TYPE "public"."listing_status" AS ENUM('draft', 'available', 'reserved', 'under_offer', 'sold', 'withdrawn', 'expired', 'archived');
  CREATE TYPE "public"."enum_properties_moderation" AS ENUM('unreviewed', 'approved', 'rejected', 'changes_requested');
  CREATE TYPE "public"."enum_properties_source_type" AS ENUM('manual', 'csv_import', 'feed', 'owner_submission');
  CREATE TYPE "public"."enum_properties_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__properties_v_version_features" AS ENUM('pool', 'indoor_pool', 'spa', 'gym', 'cinema', 'wine_cellar', 'ballroom', 'library', 'chapel', 'helipad', 'tennis', 'padel', 'golf_hole', 'equestrian', 'vineyard', 'olive_grove', 'beach', 'private_dock', 'marina_berth', 'ski_in_ski_out', 'gatehouse', 'staff_quarters', 'guest_houses', 'generator', 'geothermal', 'solar', 'smart_home', 'car_gallery', 'panic_room');
  CREATE TYPE "public"."enum__properties_v_version_property_type" AS ENUM('villa', 'estate', 'penthouse', 'townhouse', 'chalet', 'castle', 'palazzo', 'private_island', 'vineyard_estate', 'equestrian_estate', 'hotel_resort', 'development_site', 'apartment', 'lodge', 'ranch');
  CREATE TYPE "public"."enum__properties_v_version_price_type" AS ENUM('fixed', 'on_request', 'price_band', 'auction');
  CREATE TYPE "public"."enum__properties_v_version_currency" AS ENUM('EUR', 'USD', 'GBP', 'CHF', 'AED', 'SGD', 'HKD');
  CREATE TYPE "public"."enum__properties_v_version_tenure" AS ENUM('freehold', 'leasehold', 'usufruct', 'concession');
  CREATE TYPE "public"."enum__properties_v_version_ownership_structure" AS ENUM('direct', 'spv', 'trust', 'foundation', 'company');
  CREATE TYPE "public"."enum__properties_v_version_sale_structure" AS ENUM('asset_sale', 'share_transfer', 'fractional', 'auction');
  CREATE TYPE "public"."enum__properties_v_version_mandate_type" AS ENUM('exclusive', 'open', 'introduction_only');
  CREATE TYPE "public"."enum__properties_v_version_heritage_status" AS ENUM('none', 'listed', 'protected', 'unesco_area');
  CREATE TYPE "public"."enum__properties_v_version_condition" AS ENUM('new', 'renovated', 'good', 'to_renovate', 'shell');
  CREATE TYPE "public"."enum__properties_v_version_waterfront_water_body_type" AS ENUM('sea', 'ocean', 'lake', 'river', 'lagoon', 'canal', 'fjord', 'bay', 'estuary');
  CREATE TYPE "public"."enum__properties_v_version_waterfront_mooring_type" AS ENUM('none', 'buoy', 'jetty', 'pontoon', 'fixed_dock', 'floating_dock', 'boat_lift', 'marina_berth');
  CREATE TYPE "public"."enum__properties_v_version_location_coordinate_precision" AS ENUM('exact', 'approximate_500m', 'locality_only');
  CREATE TYPE "public"."enum__properties_v_version_location_public_geography" AS ENUM('country', 'region', 'market', 'locality');
  CREATE TYPE "public"."enum__properties_v_version_publication" AS ENUM('published_openly', 'published_without_price', 'published_as_band', 'off_market');
  CREATE TYPE "public"."enum__properties_v_version_channel" AS ENUM('public', 'off_market');
  CREATE TYPE "public"."enum__properties_v_version_price_disclosure" AS ENUM('exact', 'band', 'on_request');
  CREATE TYPE "public"."enum__properties_v_version_value_tier" AS ENUM('prime', 'trophy', 'signature');
  CREATE TYPE "public"."enum__properties_v_version_moderation" AS ENUM('unreviewed', 'approved', 'rejected', 'changes_requested');
  CREATE TYPE "public"."enum__properties_v_version_source_type" AS ENUM('manual', 'csv_import', 'feed', 'owner_submission');
  CREATE TYPE "public"."enum__properties_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__properties_v_published_locale" AS ENUM('en', 'it', 'fr', 'de', 'es', 'ru');
  CREATE TYPE "public"."enum_agencies_languages" AS ENUM('en', 'it', 'fr', 'de', 'es', 'ru');
  CREATE TYPE "public"."enum_agencies_tier" AS ENUM('standard', 'verified', 'partner');
  CREATE TYPE "public"."enum_agencies_feed_feed_format" AS ENUM('native_json', 'kyero_xml', 'resales_online', 'houzez_wp', 'generic_csv');
  CREATE TYPE "public"."enum_agents_languages" AS ENUM('en', 'it', 'fr', 'de', 'es', 'ru');
  CREATE TYPE "public"."enum_markets_stats_transaction_volume_band_value" AS ENUM('under_10', '10_50', '50_200', 'over_200');
  CREATE TYPE "public"."enum_enquiries_locale" AS ENUM('en', 'it', 'fr', 'de', 'es', 'ru');
  CREATE TYPE "public"."enum_enquiries_source" AS ENUM('listing', 'off_market', 'market_page', 'report', 'contact', 'sell', 'desk_call');
  CREATE TYPE "public"."enum_enquiries_status" AS ENUM('new', 'sent', 'viewed', 'qualified', 'spam');
  CREATE TYPE "public"."enum_requirements_property_types" AS ENUM('villa', 'estate', 'penthouse', 'townhouse', 'chalet', 'castle', 'palazzo', 'private_island', 'vineyard_estate', 'equestrian_estate', 'hotel_resort', 'development_site', 'apartment', 'lodge', 'ranch');
  CREATE TYPE "public"."enum_requirements_must_have_features" AS ENUM('pool', 'indoor_pool', 'spa', 'gym', 'cinema', 'wine_cellar', 'ballroom', 'library', 'chapel', 'helipad', 'tennis', 'padel', 'golf_hole', 'equestrian', 'vineyard', 'olive_grove', 'beach', 'private_dock', 'marina_berth', 'ski_in_ski_out', 'gatehouse', 'staff_quarters', 'guest_houses', 'generator', 'geothermal', 'solar', 'smart_home', 'car_gallery', 'panic_room');
  CREATE TYPE "public"."enum_requirements_currency" AS ENUM('EUR', 'USD', 'GBP', 'CHF', 'AED', 'SGD', 'HKD');
  CREATE TYPE "public"."enum_requirements_timeline" AS ENUM('immediate', '6_months', '12_months', 'opportunistic');
  CREATE TYPE "public"."enum_requirements_status" AS ENUM('active', 'paused', 'closed');
  CREATE TYPE "public"."enum_member_activity_action" AS ENUM('off_market_list', 'off_market_view', 'document_download', 'saved', 'enquiry');
  CREATE TYPE "public"."enum_reports_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__reports_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__reports_v_published_locale" AS ENUM('en', 'it', 'fr', 'de', 'es', 'ru');
  CREATE TYPE "public"."enum_landing_pages_combo_property_type" AS ENUM('villa', 'estate', 'penthouse', 'townhouse', 'chalet', 'castle', 'palazzo', 'private_island', 'vineyard_estate', 'equestrian_estate', 'hotel_resort', 'development_site', 'apartment', 'lodge', 'ranch');
  CREATE TYPE "public"."enum_landing_pages_combo_water_body_type" AS ENUM('sea', 'ocean', 'lake', 'river', 'lagoon', 'canal', 'fjord', 'bay', 'estuary');
  CREATE TYPE "public"."enum_landing_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__landing_pages_v_version_combo_property_type" AS ENUM('villa', 'estate', 'penthouse', 'townhouse', 'chalet', 'castle', 'palazzo', 'private_island', 'vineyard_estate', 'equestrian_estate', 'hotel_resort', 'development_site', 'apartment', 'lodge', 'ranch');
  CREATE TYPE "public"."enum__landing_pages_v_version_combo_water_body_type" AS ENUM('sea', 'ocean', 'lake', 'river', 'lagoon', 'canal', 'fjord', 'bay', 'estuary');
  CREATE TYPE "public"."enum__landing_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__landing_pages_v_published_locale" AS ENUM('en', 'it', 'fr', 'de', 'es', 'ru');
  CREATE TYPE "public"."enum_taxonomies_group" AS ENUM('lifestyle', 'style', 'collection');
  CREATE TYPE "public"."enum_articles_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articles_v_published_locale" AS ENUM('en', 'it', 'fr', 'de', 'es', 'ru');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_published_locale" AS ENUM('en', 'it', 'fr', 'de', 'es', 'ru');
  CREATE TYPE "public"."enum_redirects_status_code" AS ENUM('301', '302', '410');
  CREATE TYPE "public"."enum_audit_logs_action" AS ENUM('create', 'update', 'delete', 'publish', 'enquiry_view', 'enquiry_anonymized', 'lead_view', 'lead_anonymized', 'status_change');
  CREATE TYPE "public"."enum_import_jobs_kind" AS ENUM('csv', 'xlsx', 'feed');
  CREATE TYPE "public"."enum_import_jobs_status" AS ENUM('queued', 'dry_run', 'running', 'complete', 'failed');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'agency_agent' NOT NULL,
  	"agency_id" integer,
  	"agent_profile_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "members_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"phone" varchar,
  	"country" varchar,
  	"preferred_locale" "enum_members_preferred_locale" DEFAULT 'en',
  	"member_type" "enum_members_member_type",
  	"status" "enum_members_status" DEFAULT 'active' NOT NULL,
  	"email_verified_at" timestamp(3) with time zone,
  	"marketing_consent" boolean DEFAULT false,
  	"consented_at" timestamp(3) with time zone,
  	"consent_ip" varchar,
  	"last_active_at" timestamp(3) with time zone,
  	"source" "enum_members_source" DEFAULT 'organic',
  	"utm" jsonb,
  	"two_factor_enabled" boolean DEFAULT false,
  	"reserved_nda_status" varchar,
  	"reserved_nda_signed_at" timestamp(3) with time zone,
  	"reserved_capability_status" varchar,
  	"reserved_capability_band" varchar,
  	"reserved_tier" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"visibility" "enum_media_visibility" DEFAULT 'public' NOT NULL,
  	"agency_id" integer,
  	"credit" varchar,
  	"licence" varchar,
  	"source_url" varchar,
  	"source_id" varchar,
  	"blurhash" varchar,
  	"dominant_color" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_w320_url" varchar,
  	"sizes_w320_width" numeric,
  	"sizes_w320_height" numeric,
  	"sizes_w320_mime_type" varchar,
  	"sizes_w320_filesize" numeric,
  	"sizes_w320_filename" varchar,
  	"sizes_w640_url" varchar,
  	"sizes_w640_width" numeric,
  	"sizes_w640_height" numeric,
  	"sizes_w640_mime_type" varchar,
  	"sizes_w640_filesize" numeric,
  	"sizes_w640_filename" varchar,
  	"sizes_w960_url" varchar,
  	"sizes_w960_width" numeric,
  	"sizes_w960_height" numeric,
  	"sizes_w960_mime_type" varchar,
  	"sizes_w960_filesize" numeric,
  	"sizes_w960_filename" varchar,
  	"sizes_w1280_url" varchar,
  	"sizes_w1280_width" numeric,
  	"sizes_w1280_height" numeric,
  	"sizes_w1280_mime_type" varchar,
  	"sizes_w1280_filesize" numeric,
  	"sizes_w1280_filename" varchar,
  	"sizes_w1920_url" varchar,
  	"sizes_w1920_width" numeric,
  	"sizes_w1920_height" numeric,
  	"sizes_w1920_mime_type" varchar,
  	"sizes_w1920_filesize" numeric,
  	"sizes_w1920_filename" varchar,
  	"sizes_w2560_url" varchar,
  	"sizes_w2560_width" numeric,
  	"sizes_w2560_height" numeric,
  	"sizes_w2560_mime_type" varchar,
  	"sizes_w2560_filesize" numeric,
  	"sizes_w2560_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"document_type" "enum_documents_document_type" DEFAULT 'other' NOT NULL,
  	"property_id" integer,
  	"agency_id" integer,
  	"credit" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "properties_features" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_properties_features",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "properties_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "properties" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference" varchar,
  	"property_type" "enum_properties_property_type",
  	"available_from" timestamp(3) with time zone,
  	"price_type" "enum_properties_price_type" DEFAULT 'fixed',
  	"price_amount" numeric,
  	"currency" "enum_properties_currency" DEFAULT 'EUR',
  	"price_band_min" numeric,
  	"price_band_max" numeric,
  	"internal_value_eur" numeric,
  	"tenure" "enum_properties_tenure",
  	"ownership_structure" "enum_properties_ownership_structure",
  	"sale_structure" "enum_properties_sale_structure",
  	"annual_running_cost_eur" numeric,
  	"mandate_type" "enum_properties_mandate_type",
  	"commission_terms" varchar,
  	"bedrooms" numeric,
  	"bathrooms" numeric,
  	"reception_rooms" numeric,
  	"staff_accommodation" numeric,
  	"built_area_sqm" numeric,
  	"plot_area_sqm" numeric,
  	"plot_area_ha" numeric,
  	"terrace_area_sqm" numeric,
  	"floors" numeric,
  	"year_built" numeric,
  	"renovated_year" numeric,
  	"parking_spaces" numeric,
  	"architect" varchar,
  	"heritage_status" "enum_properties_heritage_status" DEFAULT 'none',
  	"condition" "enum_properties_condition",
  	"energy_rating" varchar,
  	"waterfront_water_access" boolean DEFAULT false,
  	"waterfront_water_body_type" "enum_properties_waterfront_water_body_type",
  	"waterfront_water_frontage_m" numeric,
  	"waterfront_mooring_type" "enum_properties_waterfront_mooring_type",
  	"waterfront_max_boat_loa_m" numeric,
  	"waterfront_berth_count" numeric,
  	"location_label" varchar,
  	"location_address_line" varchar,
  	"location_locality" varchar,
  	"location_province" varchar,
  	"location_region" varchar,
  	"location_country" varchar,
  	"location_continent" varchar,
  	"location_market_id" integer,
  	"location_coordinates" geometry(Point),
  	"location_coordinate_precision" "enum_properties_location_coordinate_precision" DEFAULT 'approximate_500m',
  	"location_public_geography" "enum_properties_location_public_geography" DEFAULT 'locality',
  	"video_url" varchar,
  	"virtual_tour_url" varchar,
  	"publication" "enum_properties_publication" DEFAULT 'published_openly',
  	"channel" "enum_properties_channel" DEFAULT 'public',
  	"price_disclosure" "enum_properties_price_disclosure" DEFAULT 'exact',
  	"value_tier" "enum_properties_value_tier",
  	"slug" varchar,
  	"agency_id" integer,
  	"agent_id" integer,
  	"status" "listing_status" DEFAULT 'draft',
  	"moderation" "enum_properties_moderation" DEFAULT 'unreviewed',
  	"moderation_note" varchar,
  	"featured" boolean DEFAULT false,
  	"is_sample" boolean DEFAULT false,
  	"price_eur" numeric,
  	"price_band_min_eur" numeric,
  	"price_band_max_eur" numeric,
  	"published_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"last_verified_at" timestamp(3) with time zone,
  	"expiry_reminder_sent_at" timestamp(3) with time zone,
  	"source_type" "enum_properties_source_type" DEFAULT 'manual',
  	"duplicate_of_id" integer,
  	"fingerprint" varchar,
  	"view_count" numeric DEFAULT 0,
  	"member_view_count" numeric DEFAULT 0,
  	"enquiry_count" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_properties_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "properties_locales" (
  	"title" varchar,
  	"subtitle" varchar,
  	"tax_notes" jsonb,
  	"provenance" jsonb,
  	"description" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "properties_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"documents_id" integer
  );
  
  CREATE TABLE "_properties_v_version_features" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__properties_v_version_features",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_properties_v_version_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_properties_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_reference" varchar,
  	"version_property_type" "enum__properties_v_version_property_type",
  	"version_available_from" timestamp(3) with time zone,
  	"version_price_type" "enum__properties_v_version_price_type" DEFAULT 'fixed',
  	"version_price_amount" numeric,
  	"version_currency" "enum__properties_v_version_currency" DEFAULT 'EUR',
  	"version_price_band_min" numeric,
  	"version_price_band_max" numeric,
  	"version_internal_value_eur" numeric,
  	"version_tenure" "enum__properties_v_version_tenure",
  	"version_ownership_structure" "enum__properties_v_version_ownership_structure",
  	"version_sale_structure" "enum__properties_v_version_sale_structure",
  	"version_annual_running_cost_eur" numeric,
  	"version_mandate_type" "enum__properties_v_version_mandate_type",
  	"version_commission_terms" varchar,
  	"version_bedrooms" numeric,
  	"version_bathrooms" numeric,
  	"version_reception_rooms" numeric,
  	"version_staff_accommodation" numeric,
  	"version_built_area_sqm" numeric,
  	"version_plot_area_sqm" numeric,
  	"version_plot_area_ha" numeric,
  	"version_terrace_area_sqm" numeric,
  	"version_floors" numeric,
  	"version_year_built" numeric,
  	"version_renovated_year" numeric,
  	"version_parking_spaces" numeric,
  	"version_architect" varchar,
  	"version_heritage_status" "enum__properties_v_version_heritage_status" DEFAULT 'none',
  	"version_condition" "enum__properties_v_version_condition",
  	"version_energy_rating" varchar,
  	"version_waterfront_water_access" boolean DEFAULT false,
  	"version_waterfront_water_body_type" "enum__properties_v_version_waterfront_water_body_type",
  	"version_waterfront_water_frontage_m" numeric,
  	"version_waterfront_mooring_type" "enum__properties_v_version_waterfront_mooring_type",
  	"version_waterfront_max_boat_loa_m" numeric,
  	"version_waterfront_berth_count" numeric,
  	"version_location_label" varchar,
  	"version_location_address_line" varchar,
  	"version_location_locality" varchar,
  	"version_location_province" varchar,
  	"version_location_region" varchar,
  	"version_location_country" varchar,
  	"version_location_continent" varchar,
  	"version_location_market_id" integer,
  	"version_location_coordinates" geometry(Point),
  	"version_location_coordinate_precision" "enum__properties_v_version_location_coordinate_precision" DEFAULT 'approximate_500m',
  	"version_location_public_geography" "enum__properties_v_version_location_public_geography" DEFAULT 'locality',
  	"version_video_url" varchar,
  	"version_virtual_tour_url" varchar,
  	"version_publication" "enum__properties_v_version_publication" DEFAULT 'published_openly',
  	"version_channel" "enum__properties_v_version_channel" DEFAULT 'public',
  	"version_price_disclosure" "enum__properties_v_version_price_disclosure" DEFAULT 'exact',
  	"version_value_tier" "enum__properties_v_version_value_tier",
  	"version_slug" varchar,
  	"version_agency_id" integer,
  	"version_agent_id" integer,
  	"version_status" "listing_status" DEFAULT 'draft',
  	"version_moderation" "enum__properties_v_version_moderation" DEFAULT 'unreviewed',
  	"version_moderation_note" varchar,
  	"version_featured" boolean DEFAULT false,
  	"version_is_sample" boolean DEFAULT false,
  	"version_price_eur" numeric,
  	"version_price_band_min_eur" numeric,
  	"version_price_band_max_eur" numeric,
  	"version_published_at" timestamp(3) with time zone,
  	"version_expires_at" timestamp(3) with time zone,
  	"version_last_verified_at" timestamp(3) with time zone,
  	"version_expiry_reminder_sent_at" timestamp(3) with time zone,
  	"version_source_type" "enum__properties_v_version_source_type" DEFAULT 'manual',
  	"version_duplicate_of_id" integer,
  	"version_fingerprint" varchar,
  	"version_view_count" numeric DEFAULT 0,
  	"version_member_view_count" numeric DEFAULT 0,
  	"version_enquiry_count" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__properties_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__properties_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_properties_v_locales" (
  	"version_title" varchar,
  	"version_subtitle" varchar,
  	"version_tax_notes" jsonb,
  	"version_provenance" jsonb,
  	"version_description" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_properties_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"documents_id" integer
  );
  
  CREATE TABLE "agencies_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_agencies_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "agencies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"logo_id" integer,
  	"country" varchar,
  	"website" varchar,
  	"phone" varchar,
  	"whatsapp" varchar,
  	"email" varchar,
  	"licence_number" varchar,
  	"verified" boolean DEFAULT false,
  	"verified_at" timestamp(3) with time zone,
  	"tier" "enum_agencies_tier" DEFAULT 'standard',
  	"listing_quota" numeric,
  	"feed_feed_url" varchar,
  	"feed_feed_token" varchar,
  	"feed_feed_format" "enum_agencies_feed_feed_format",
  	"feed_feed_last_run_at" timestamp(3) with time zone,
  	"feed_feed_last_status" varchar,
  	"feed_field_mapping" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "agencies_locales" (
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "agents_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_agents_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "agents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"agency_id" integer NOT NULL,
  	"photo_id" integer,
  	"role" varchar,
  	"phone" varchar,
  	"whatsapp" varchar,
  	"email" varchar,
  	"receives_leads" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "markets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"country" varchar,
  	"region" varchar,
  	"polygon" jsonb,
  	"centroid" geometry(Point),
  	"hero_image_id" integer,
  	"stats_median_price_eur_per_sqm_value" numeric,
  	"stats_median_price_eur_per_sqm_source" varchar,
  	"stats_median_price_eur_per_sqm_as_of_date" timestamp(3) with time zone,
  	"stats_prime_entry_eur_value" numeric,
  	"stats_prime_entry_eur_source" varchar,
  	"stats_prime_entry_eur_as_of_date" timestamp(3) with time zone,
  	"stats_yoy_change_pct_value" numeric,
  	"stats_yoy_change_pct_source" varchar,
  	"stats_yoy_change_pct_as_of_date" timestamp(3) with time zone,
  	"stats_avg_days_on_market_value" numeric,
  	"stats_avg_days_on_market_source" varchar,
  	"stats_avg_days_on_market_as_of_date" timestamp(3) with time zone,
  	"stats_transaction_volume_band_value" "enum_markets_stats_transaction_volume_band_value",
  	"stats_transaction_volume_band_source" varchar,
  	"stats_transaction_volume_band_as_of_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "markets_locales" (
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"intro" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "enquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"message" varchar,
  	"property_id" integer,
  	"agency_id" integer,
  	"agent_id" integer,
  	"member_id" integer,
  	"locale" "enum_enquiries_locale",
  	"source" "enum_enquiries_source" NOT NULL,
  	"status" "enum_enquiries_status" DEFAULT 'new' NOT NULL,
  	"consent_consent_marketing" boolean DEFAULT false,
  	"consent_consented_at" timestamp(3) with time zone,
  	"consent_consent_ip" varchar,
  	"reminder_sent_at" timestamp(3) with time zone,
  	"utm" jsonb,
  	"crm_contact_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "saved_listings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"property_id" integer NOT NULL,
  	"note" varchar,
  	"saved_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "requirements_property_types" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_requirements_property_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "requirements_must_have_features" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_requirements_must_have_features",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "requirements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"budget_min_eur" numeric,
  	"budget_max_eur" numeric,
  	"currency" "enum_requirements_currency" DEFAULT 'EUR',
  	"timeline" "enum_requirements_timeline",
  	"notes" varchar,
  	"status" "enum_requirements_status" DEFAULT 'active' NOT NULL,
  	"notify_by_email" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "requirements_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"markets_id" integer
  );
  
  CREATE TABLE "member_activity" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"property_id" integer,
  	"action" "enum_member_activity_action" NOT NULL,
  	"at" timestamp(3) with time zone NOT NULL,
  	"ip" varchar,
  	"user_agent" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "reports_authors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar
  );
  
  CREATE TABLE "reports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"pdf_id" integer,
  	"charts" jsonb,
  	"publication_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_reports_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "reports_locales" (
  	"title" varchar,
  	"summary" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "reports_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"markets_id" integer
  );
  
  CREATE TABLE "_reports_v_version_authors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_reports_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_pdf_id" integer,
  	"version_charts" jsonb,
  	"version_publication_date" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__reports_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__reports_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_reports_v_locales" (
  	"version_title" varchar,
  	"version_summary" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_reports_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"markets_id" integer
  );
  
  CREATE TABLE "fx_snapshots" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" varchar NOT NULL,
  	"rates_per_eur" jsonb NOT NULL,
  	"source" varchar DEFAULT 'frankfurter/ecb',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "landing_pages_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "landing_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"combo_property_type" "enum_landing_pages_combo_property_type",
  	"combo_water_body_type" "enum_landing_pages_combo_water_body_type",
  	"combo_destination_id" integer,
  	"combo_country" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_landing_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "landing_pages_locales" (
  	"title" varchar,
  	"intro" jsonb,
  	"body" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_pages_v_version_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_landing_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_combo_property_type" "enum__landing_pages_v_version_combo_property_type",
  	"version_combo_water_body_type" "enum__landing_pages_v_version_combo_water_body_type",
  	"version_combo_destination_id" integer,
  	"version_combo_country" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__landing_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__landing_pages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_landing_pages_v_locales" (
  	"version_title" varchar,
  	"version_intro" jsonb,
  	"version_body" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "taxonomies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"group" "enum_taxonomies_group" NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "taxonomies_locales" (
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"hero_image_id" integer,
  	"author_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_articles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "articles_locales" (
  	"title" varchar,
  	"excerpt" varchar,
  	"body" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_articles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_hero_image_id" integer,
  	"version_author_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__articles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__articles_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_articles_v_locales" (
  	"version_title" varchar,
  	"version_excerpt" varchar,
  	"version_body" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_locales" (
  	"title" varchar,
  	"body" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__pages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_pages_v_locales" (
  	"version_title" varchar,
  	"version_body" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to" varchar,
  	"status_code" "enum_redirects_status_code" DEFAULT '301' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "audit_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"action" "enum_audit_logs_action" NOT NULL,
  	"target_collection" varchar NOT NULL,
  	"target_id" varchar NOT NULL,
  	"summary" varchar,
  	"actor_id" integer,
  	"actor_email" varchar,
  	"actor_role" varchar,
  	"agency_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "import_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"agency_id" integer NOT NULL,
  	"source_filename" varchar,
  	"kind" "enum_import_jobs_kind" DEFAULT 'csv',
  	"status" "enum_import_jobs_status" DEFAULT 'queued' NOT NULL,
  	"rows_processed" numeric DEFAULT 0,
  	"rows_failed" numeric DEFAULT 0,
  	"error_report" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "consent_records" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"analytics" boolean DEFAULT false NOT NULL,
  	"marketing" boolean DEFAULT false NOT NULL,
  	"locale" varchar,
  	"ip_hash" varchar,
  	"user_agent" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"members_id" integer,
  	"media_id" integer,
  	"documents_id" integer,
  	"properties_id" integer,
  	"agencies_id" integer,
  	"agents_id" integer,
  	"markets_id" integer,
  	"enquiries_id" integer,
  	"saved_listings_id" integer,
  	"requirements_id" integer,
  	"member_activity_id" integer,
  	"reports_id" integer,
  	"fx_snapshots_id" integer,
  	"landing_pages_id" integer,
  	"taxonomies_id" integer,
  	"articles_id" integer,
  	"pages_id" integer,
  	"redirects_id" integer,
  	"audit_logs_id" integer,
  	"import_jobs_id" integer,
  	"consent_records_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"members_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_agent_profile_id_agents_id_fk" FOREIGN KEY ("agent_profile_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "members_sessions" ADD CONSTRAINT "members_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "documents" ADD CONSTRAINT "documents_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documents" ADD CONSTRAINT "documents_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties_features" ADD CONSTRAINT "properties_features_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "properties_highlights" ADD CONSTRAINT "properties_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "properties" ADD CONSTRAINT "properties_location_market_id_markets_id_fk" FOREIGN KEY ("location_market_id") REFERENCES "public"."markets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties" ADD CONSTRAINT "properties_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties" ADD CONSTRAINT "properties_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties" ADD CONSTRAINT "properties_duplicate_of_id_properties_id_fk" FOREIGN KEY ("duplicate_of_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties_locales" ADD CONSTRAINT "properties_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "properties_rels" ADD CONSTRAINT "properties_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "properties_rels" ADD CONSTRAINT "properties_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "properties_rels" ADD CONSTRAINT "properties_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_properties_v_version_features" ADD CONSTRAINT "_properties_v_version_features_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_properties_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_properties_v_version_highlights" ADD CONSTRAINT "_properties_v_version_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_properties_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_properties_v" ADD CONSTRAINT "_properties_v_parent_id_properties_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_properties_v" ADD CONSTRAINT "_properties_v_version_location_market_id_markets_id_fk" FOREIGN KEY ("version_location_market_id") REFERENCES "public"."markets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_properties_v" ADD CONSTRAINT "_properties_v_version_agency_id_agencies_id_fk" FOREIGN KEY ("version_agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_properties_v" ADD CONSTRAINT "_properties_v_version_agent_id_agents_id_fk" FOREIGN KEY ("version_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_properties_v" ADD CONSTRAINT "_properties_v_version_duplicate_of_id_properties_id_fk" FOREIGN KEY ("version_duplicate_of_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_properties_v_locales" ADD CONSTRAINT "_properties_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_properties_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_properties_v_rels" ADD CONSTRAINT "_properties_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_properties_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_properties_v_rels" ADD CONSTRAINT "_properties_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_properties_v_rels" ADD CONSTRAINT "_properties_v_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "agencies_languages" ADD CONSTRAINT "agencies_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "agencies" ADD CONSTRAINT "agencies_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agencies_locales" ADD CONSTRAINT "agencies_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "agents_languages" ADD CONSTRAINT "agents_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "agents" ADD CONSTRAINT "agents_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agents" ADD CONSTRAINT "agents_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "markets" ADD CONSTRAINT "markets_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "markets_locales" ADD CONSTRAINT "markets_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "saved_listings" ADD CONSTRAINT "saved_listings_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "saved_listings" ADD CONSTRAINT "saved_listings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "requirements_property_types" ADD CONSTRAINT "requirements_property_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."requirements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "requirements_must_have_features" ADD CONSTRAINT "requirements_must_have_features_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."requirements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "requirements" ADD CONSTRAINT "requirements_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "requirements_rels" ADD CONSTRAINT "requirements_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."requirements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "requirements_rels" ADD CONSTRAINT "requirements_rels_markets_fk" FOREIGN KEY ("markets_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "member_activity" ADD CONSTRAINT "member_activity_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "member_activity" ADD CONSTRAINT "member_activity_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reports_authors" ADD CONSTRAINT "reports_authors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "reports" ADD CONSTRAINT "reports_pdf_id_documents_id_fk" FOREIGN KEY ("pdf_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reports_locales" ADD CONSTRAINT "reports_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "reports_rels" ADD CONSTRAINT "reports_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "reports_rels" ADD CONSTRAINT "reports_rels_markets_fk" FOREIGN KEY ("markets_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_reports_v_version_authors" ADD CONSTRAINT "_reports_v_version_authors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_reports_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_reports_v" ADD CONSTRAINT "_reports_v_parent_id_reports_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."reports"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_reports_v" ADD CONSTRAINT "_reports_v_version_pdf_id_documents_id_fk" FOREIGN KEY ("version_pdf_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_reports_v_locales" ADD CONSTRAINT "_reports_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_reports_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_reports_v_rels" ADD CONSTRAINT "_reports_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_reports_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_reports_v_rels" ADD CONSTRAINT "_reports_v_rels_markets_fk" FOREIGN KEY ("markets_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_pages_faq" ADD CONSTRAINT "landing_pages_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_combo_destination_id_markets_id_fk" FOREIGN KEY ("combo_destination_id") REFERENCES "public"."markets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "landing_pages_locales" ADD CONSTRAINT "landing_pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_pages_v_version_faq" ADD CONSTRAINT "_landing_pages_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_pages_v" ADD CONSTRAINT "_landing_pages_v_parent_id_landing_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."landing_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_landing_pages_v" ADD CONSTRAINT "_landing_pages_v_version_combo_destination_id_markets_id_fk" FOREIGN KEY ("version_combo_destination_id") REFERENCES "public"."markets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_landing_pages_v_locales" ADD CONSTRAINT "_landing_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "taxonomies_locales" ADD CONSTRAINT "taxonomies_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."taxonomies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_locales" ADD CONSTRAINT "articles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_author_id_users_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_locales" ADD CONSTRAINT "_articles_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_properties_fk" FOREIGN KEY ("properties_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agencies_fk" FOREIGN KEY ("agencies_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agents_fk" FOREIGN KEY ("agents_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_markets_fk" FOREIGN KEY ("markets_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_enquiries_fk" FOREIGN KEY ("enquiries_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_saved_listings_fk" FOREIGN KEY ("saved_listings_id") REFERENCES "public"."saved_listings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_requirements_fk" FOREIGN KEY ("requirements_id") REFERENCES "public"."requirements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_member_activity_fk" FOREIGN KEY ("member_activity_id") REFERENCES "public"."member_activity"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reports_fk" FOREIGN KEY ("reports_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_fx_snapshots_fk" FOREIGN KEY ("fx_snapshots_id") REFERENCES "public"."fx_snapshots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_landing_pages_fk" FOREIGN KEY ("landing_pages_id") REFERENCES "public"."landing_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_taxonomies_fk" FOREIGN KEY ("taxonomies_id") REFERENCES "public"."taxonomies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_logs_fk" FOREIGN KEY ("audit_logs_id") REFERENCES "public"."audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_import_jobs_fk" FOREIGN KEY ("import_jobs_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_consent_records_fk" FOREIGN KEY ("consent_records_id") REFERENCES "public"."consent_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_agency_idx" ON "users" USING btree ("agency_id");
  CREATE INDEX "users_agent_profile_idx" ON "users" USING btree ("agent_profile_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "members_sessions_order_idx" ON "members_sessions" USING btree ("_order");
  CREATE INDEX "members_sessions_parent_id_idx" ON "members_sessions" USING btree ("_parent_id");
  CREATE INDEX "members_status_idx" ON "members" USING btree ("status");
  CREATE INDEX "members_last_active_at_idx" ON "members" USING btree ("last_active_at");
  CREATE INDEX "members_updated_at_idx" ON "members" USING btree ("updated_at");
  CREATE INDEX "members_created_at_idx" ON "members" USING btree ("created_at");
  CREATE UNIQUE INDEX "members_email_idx" ON "members" USING btree ("email");
  CREATE INDEX "media_visibility_idx" ON "media" USING btree ("visibility");
  CREATE INDEX "media_agency_idx" ON "media" USING btree ("agency_id");
  CREATE INDEX "media_source_id_idx" ON "media" USING btree ("source_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_w320_sizes_w320_filename_idx" ON "media" USING btree ("sizes_w320_filename");
  CREATE INDEX "media_sizes_w640_sizes_w640_filename_idx" ON "media" USING btree ("sizes_w640_filename");
  CREATE INDEX "media_sizes_w960_sizes_w960_filename_idx" ON "media" USING btree ("sizes_w960_filename");
  CREATE INDEX "media_sizes_w1280_sizes_w1280_filename_idx" ON "media" USING btree ("sizes_w1280_filename");
  CREATE INDEX "media_sizes_w1920_sizes_w1920_filename_idx" ON "media" USING btree ("sizes_w1920_filename");
  CREATE INDEX "media_sizes_w2560_sizes_w2560_filename_idx" ON "media" USING btree ("sizes_w2560_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "documents_property_idx" ON "documents" USING btree ("property_id");
  CREATE INDEX "documents_agency_idx" ON "documents" USING btree ("agency_id");
  CREATE INDEX "documents_updated_at_idx" ON "documents" USING btree ("updated_at");
  CREATE INDEX "documents_created_at_idx" ON "documents" USING btree ("created_at");
  CREATE UNIQUE INDEX "documents_filename_idx" ON "documents" USING btree ("filename");
  CREATE INDEX "properties_features_order_idx" ON "properties_features" USING btree ("order");
  CREATE INDEX "properties_features_parent_idx" ON "properties_features" USING btree ("parent_id");
  CREATE INDEX "properties_highlights_order_idx" ON "properties_highlights" USING btree ("_order");
  CREATE INDEX "properties_highlights_parent_id_idx" ON "properties_highlights" USING btree ("_parent_id");
  CREATE INDEX "properties_highlights_locale_idx" ON "properties_highlights" USING btree ("_locale");
  CREATE INDEX "properties_property_type_idx" ON "properties" USING btree ("property_type");
  CREATE INDEX "properties_location_location_country_idx" ON "properties" USING btree ("location_country");
  CREATE INDEX "properties_location_location_market_idx" ON "properties" USING btree ("location_market_id");
  CREATE INDEX "properties_location_location_coordinates_idx" ON "properties" USING btree ("location_coordinates");
  CREATE INDEX "properties_channel_idx" ON "properties" USING btree ("channel");
  CREATE INDEX "properties_price_disclosure_idx" ON "properties" USING btree ("price_disclosure");
  CREATE INDEX "properties_value_tier_idx" ON "properties" USING btree ("value_tier");
  CREATE UNIQUE INDEX "properties_slug_idx" ON "properties" USING btree ("slug");
  CREATE INDEX "properties_agency_idx" ON "properties" USING btree ("agency_id");
  CREATE INDEX "properties_agent_idx" ON "properties" USING btree ("agent_id");
  CREATE INDEX "properties_status_idx" ON "properties" USING btree ("status");
  CREATE INDEX "properties_moderation_idx" ON "properties" USING btree ("moderation");
  CREATE INDEX "properties_featured_idx" ON "properties" USING btree ("featured");
  CREATE INDEX "properties_is_sample_idx" ON "properties" USING btree ("is_sample");
  CREATE INDEX "properties_price_eur_idx" ON "properties" USING btree ("price_eur");
  CREATE INDEX "properties_expires_at_idx" ON "properties" USING btree ("expires_at");
  CREATE INDEX "properties_duplicate_of_idx" ON "properties" USING btree ("duplicate_of_id");
  CREATE INDEX "properties_fingerprint_idx" ON "properties" USING btree ("fingerprint");
  CREATE INDEX "properties_updated_at_idx" ON "properties" USING btree ("updated_at");
  CREATE INDEX "properties_created_at_idx" ON "properties" USING btree ("created_at");
  CREATE INDEX "properties__status_idx" ON "properties" USING btree ("_status");
  CREATE INDEX "channel_status_isSample_idx" ON "properties" USING btree ("channel","status","is_sample");
  CREATE UNIQUE INDEX "agency_reference_idx" ON "properties" USING btree ("agency_id","reference");
  CREATE UNIQUE INDEX "properties_locales_locale_parent_id_unique" ON "properties_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "properties_rels_order_idx" ON "properties_rels" USING btree ("order");
  CREATE INDEX "properties_rels_parent_idx" ON "properties_rels" USING btree ("parent_id");
  CREATE INDEX "properties_rels_path_idx" ON "properties_rels" USING btree ("path");
  CREATE INDEX "properties_rels_media_id_idx" ON "properties_rels" USING btree ("media_id");
  CREATE INDEX "properties_rels_documents_id_idx" ON "properties_rels" USING btree ("documents_id");
  CREATE INDEX "_properties_v_version_features_order_idx" ON "_properties_v_version_features" USING btree ("order");
  CREATE INDEX "_properties_v_version_features_parent_idx" ON "_properties_v_version_features" USING btree ("parent_id");
  CREATE INDEX "_properties_v_version_highlights_order_idx" ON "_properties_v_version_highlights" USING btree ("_order");
  CREATE INDEX "_properties_v_version_highlights_parent_id_idx" ON "_properties_v_version_highlights" USING btree ("_parent_id");
  CREATE INDEX "_properties_v_version_highlights_locale_idx" ON "_properties_v_version_highlights" USING btree ("_locale");
  CREATE INDEX "_properties_v_parent_idx" ON "_properties_v" USING btree ("parent_id");
  CREATE INDEX "_properties_v_version_version_property_type_idx" ON "_properties_v" USING btree ("version_property_type");
  CREATE INDEX "_properties_v_version_location_version_location_country_idx" ON "_properties_v" USING btree ("version_location_country");
  CREATE INDEX "_properties_v_version_location_version_location_market_idx" ON "_properties_v" USING btree ("version_location_market_id");
  CREATE INDEX "_properties_v_version_location_version_location_coordina_idx" ON "_properties_v" USING btree ("version_location_coordinates");
  CREATE INDEX "_properties_v_version_version_channel_idx" ON "_properties_v" USING btree ("version_channel");
  CREATE INDEX "_properties_v_version_version_price_disclosure_idx" ON "_properties_v" USING btree ("version_price_disclosure");
  CREATE INDEX "_properties_v_version_version_value_tier_idx" ON "_properties_v" USING btree ("version_value_tier");
  CREATE INDEX "_properties_v_version_version_slug_idx" ON "_properties_v" USING btree ("version_slug");
  CREATE INDEX "_properties_v_version_version_agency_idx" ON "_properties_v" USING btree ("version_agency_id");
  CREATE INDEX "_properties_v_version_version_agent_idx" ON "_properties_v" USING btree ("version_agent_id");
  CREATE INDEX "_properties_v_version_version_status_idx" ON "_properties_v" USING btree ("version_status");
  CREATE INDEX "_properties_v_version_version_moderation_idx" ON "_properties_v" USING btree ("version_moderation");
  CREATE INDEX "_properties_v_version_version_featured_idx" ON "_properties_v" USING btree ("version_featured");
  CREATE INDEX "_properties_v_version_version_is_sample_idx" ON "_properties_v" USING btree ("version_is_sample");
  CREATE INDEX "_properties_v_version_version_price_eur_idx" ON "_properties_v" USING btree ("version_price_eur");
  CREATE INDEX "_properties_v_version_version_expires_at_idx" ON "_properties_v" USING btree ("version_expires_at");
  CREATE INDEX "_properties_v_version_version_duplicate_of_idx" ON "_properties_v" USING btree ("version_duplicate_of_id");
  CREATE INDEX "_properties_v_version_version_fingerprint_idx" ON "_properties_v" USING btree ("version_fingerprint");
  CREATE INDEX "_properties_v_version_version_updated_at_idx" ON "_properties_v" USING btree ("version_updated_at");
  CREATE INDEX "_properties_v_version_version_created_at_idx" ON "_properties_v" USING btree ("version_created_at");
  CREATE INDEX "_properties_v_version_version__status_idx" ON "_properties_v" USING btree ("version__status");
  CREATE INDEX "_properties_v_created_at_idx" ON "_properties_v" USING btree ("created_at");
  CREATE INDEX "_properties_v_updated_at_idx" ON "_properties_v" USING btree ("updated_at");
  CREATE INDEX "_properties_v_snapshot_idx" ON "_properties_v" USING btree ("snapshot");
  CREATE INDEX "_properties_v_published_locale_idx" ON "_properties_v" USING btree ("published_locale");
  CREATE INDEX "_properties_v_latest_idx" ON "_properties_v" USING btree ("latest");
  CREATE INDEX "_properties_v_autosave_idx" ON "_properties_v" USING btree ("autosave");
  CREATE INDEX "version_channel_version_status_version_isSample_idx" ON "_properties_v" USING btree ("version_channel","version_status","version_is_sample");
  CREATE INDEX "version_agency_version_reference_idx" ON "_properties_v" USING btree ("version_agency_id","version_reference");
  CREATE UNIQUE INDEX "_properties_v_locales_locale_parent_id_unique" ON "_properties_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_properties_v_rels_order_idx" ON "_properties_v_rels" USING btree ("order");
  CREATE INDEX "_properties_v_rels_parent_idx" ON "_properties_v_rels" USING btree ("parent_id");
  CREATE INDEX "_properties_v_rels_path_idx" ON "_properties_v_rels" USING btree ("path");
  CREATE INDEX "_properties_v_rels_media_id_idx" ON "_properties_v_rels" USING btree ("media_id");
  CREATE INDEX "_properties_v_rels_documents_id_idx" ON "_properties_v_rels" USING btree ("documents_id");
  CREATE INDEX "agencies_languages_order_idx" ON "agencies_languages" USING btree ("order");
  CREATE INDEX "agencies_languages_parent_idx" ON "agencies_languages" USING btree ("parent_id");
  CREATE UNIQUE INDEX "agencies_slug_idx" ON "agencies" USING btree ("slug");
  CREATE INDEX "agencies_logo_idx" ON "agencies" USING btree ("logo_id");
  CREATE INDEX "agencies_updated_at_idx" ON "agencies" USING btree ("updated_at");
  CREATE INDEX "agencies_created_at_idx" ON "agencies" USING btree ("created_at");
  CREATE UNIQUE INDEX "agencies_locales_locale_parent_id_unique" ON "agencies_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "agents_languages_order_idx" ON "agents_languages" USING btree ("order");
  CREATE INDEX "agents_languages_parent_idx" ON "agents_languages" USING btree ("parent_id");
  CREATE INDEX "agents_agency_idx" ON "agents" USING btree ("agency_id");
  CREATE INDEX "agents_photo_idx" ON "agents" USING btree ("photo_id");
  CREATE INDEX "agents_updated_at_idx" ON "agents" USING btree ("updated_at");
  CREATE INDEX "agents_created_at_idx" ON "agents" USING btree ("created_at");
  CREATE INDEX "markets_country_idx" ON "markets" USING btree ("country");
  CREATE INDEX "markets_hero_image_idx" ON "markets" USING btree ("hero_image_id");
  CREATE INDEX "markets_updated_at_idx" ON "markets" USING btree ("updated_at");
  CREATE INDEX "markets_created_at_idx" ON "markets" USING btree ("created_at");
  CREATE INDEX "markets_slug_idx" ON "markets_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "markets_locales_locale_parent_id_unique" ON "markets_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "enquiries_property_idx" ON "enquiries" USING btree ("property_id");
  CREATE INDEX "enquiries_agency_idx" ON "enquiries" USING btree ("agency_id");
  CREATE INDEX "enquiries_agent_idx" ON "enquiries" USING btree ("agent_id");
  CREATE INDEX "enquiries_member_idx" ON "enquiries" USING btree ("member_id");
  CREATE INDEX "enquiries_status_idx" ON "enquiries" USING btree ("status");
  CREATE INDEX "enquiries_updated_at_idx" ON "enquiries" USING btree ("updated_at");
  CREATE INDEX "enquiries_created_at_idx" ON "enquiries" USING btree ("created_at");
  CREATE INDEX "saved_listings_member_idx" ON "saved_listings" USING btree ("member_id");
  CREATE INDEX "saved_listings_property_idx" ON "saved_listings" USING btree ("property_id");
  CREATE INDEX "saved_listings_updated_at_idx" ON "saved_listings" USING btree ("updated_at");
  CREATE INDEX "saved_listings_created_at_idx" ON "saved_listings" USING btree ("created_at");
  CREATE UNIQUE INDEX "member_property_idx" ON "saved_listings" USING btree ("member_id","property_id");
  CREATE INDEX "requirements_property_types_order_idx" ON "requirements_property_types" USING btree ("order");
  CREATE INDEX "requirements_property_types_parent_idx" ON "requirements_property_types" USING btree ("parent_id");
  CREATE INDEX "requirements_must_have_features_order_idx" ON "requirements_must_have_features" USING btree ("order");
  CREATE INDEX "requirements_must_have_features_parent_idx" ON "requirements_must_have_features" USING btree ("parent_id");
  CREATE INDEX "requirements_member_idx" ON "requirements" USING btree ("member_id");
  CREATE INDEX "requirements_status_idx" ON "requirements" USING btree ("status");
  CREATE INDEX "requirements_updated_at_idx" ON "requirements" USING btree ("updated_at");
  CREATE INDEX "requirements_created_at_idx" ON "requirements" USING btree ("created_at");
  CREATE INDEX "requirements_rels_order_idx" ON "requirements_rels" USING btree ("order");
  CREATE INDEX "requirements_rels_parent_idx" ON "requirements_rels" USING btree ("parent_id");
  CREATE INDEX "requirements_rels_path_idx" ON "requirements_rels" USING btree ("path");
  CREATE INDEX "requirements_rels_markets_id_idx" ON "requirements_rels" USING btree ("markets_id");
  CREATE INDEX "member_activity_member_idx" ON "member_activity" USING btree ("member_id");
  CREATE INDEX "member_activity_property_idx" ON "member_activity" USING btree ("property_id");
  CREATE INDEX "member_activity_action_idx" ON "member_activity" USING btree ("action");
  CREATE INDEX "member_activity_updated_at_idx" ON "member_activity" USING btree ("updated_at");
  CREATE INDEX "member_activity_created_at_idx" ON "member_activity" USING btree ("created_at");
  CREATE INDEX "member_at_idx" ON "member_activity" USING btree ("member_id","at");
  CREATE INDEX "property_at_idx" ON "member_activity" USING btree ("property_id","at");
  CREATE INDEX "reports_authors_order_idx" ON "reports_authors" USING btree ("_order");
  CREATE INDEX "reports_authors_parent_id_idx" ON "reports_authors" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "reports_slug_idx" ON "reports" USING btree ("slug");
  CREATE INDEX "reports_pdf_idx" ON "reports" USING btree ("pdf_id");
  CREATE INDEX "reports_publication_date_idx" ON "reports" USING btree ("publication_date");
  CREATE INDEX "reports_updated_at_idx" ON "reports" USING btree ("updated_at");
  CREATE INDEX "reports_created_at_idx" ON "reports" USING btree ("created_at");
  CREATE INDEX "reports__status_idx" ON "reports" USING btree ("_status");
  CREATE UNIQUE INDEX "reports_locales_locale_parent_id_unique" ON "reports_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "reports_rels_order_idx" ON "reports_rels" USING btree ("order");
  CREATE INDEX "reports_rels_parent_idx" ON "reports_rels" USING btree ("parent_id");
  CREATE INDEX "reports_rels_path_idx" ON "reports_rels" USING btree ("path");
  CREATE INDEX "reports_rels_markets_id_idx" ON "reports_rels" USING btree ("markets_id");
  CREATE INDEX "_reports_v_version_authors_order_idx" ON "_reports_v_version_authors" USING btree ("_order");
  CREATE INDEX "_reports_v_version_authors_parent_id_idx" ON "_reports_v_version_authors" USING btree ("_parent_id");
  CREATE INDEX "_reports_v_parent_idx" ON "_reports_v" USING btree ("parent_id");
  CREATE INDEX "_reports_v_version_version_slug_idx" ON "_reports_v" USING btree ("version_slug");
  CREATE INDEX "_reports_v_version_version_pdf_idx" ON "_reports_v" USING btree ("version_pdf_id");
  CREATE INDEX "_reports_v_version_version_publication_date_idx" ON "_reports_v" USING btree ("version_publication_date");
  CREATE INDEX "_reports_v_version_version_updated_at_idx" ON "_reports_v" USING btree ("version_updated_at");
  CREATE INDEX "_reports_v_version_version_created_at_idx" ON "_reports_v" USING btree ("version_created_at");
  CREATE INDEX "_reports_v_version_version__status_idx" ON "_reports_v" USING btree ("version__status");
  CREATE INDEX "_reports_v_created_at_idx" ON "_reports_v" USING btree ("created_at");
  CREATE INDEX "_reports_v_updated_at_idx" ON "_reports_v" USING btree ("updated_at");
  CREATE INDEX "_reports_v_snapshot_idx" ON "_reports_v" USING btree ("snapshot");
  CREATE INDEX "_reports_v_published_locale_idx" ON "_reports_v" USING btree ("published_locale");
  CREATE INDEX "_reports_v_latest_idx" ON "_reports_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_reports_v_locales_locale_parent_id_unique" ON "_reports_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_reports_v_rels_order_idx" ON "_reports_v_rels" USING btree ("order");
  CREATE INDEX "_reports_v_rels_parent_idx" ON "_reports_v_rels" USING btree ("parent_id");
  CREATE INDEX "_reports_v_rels_path_idx" ON "_reports_v_rels" USING btree ("path");
  CREATE INDEX "_reports_v_rels_markets_id_idx" ON "_reports_v_rels" USING btree ("markets_id");
  CREATE UNIQUE INDEX "fx_snapshots_date_idx" ON "fx_snapshots" USING btree ("date");
  CREATE INDEX "fx_snapshots_updated_at_idx" ON "fx_snapshots" USING btree ("updated_at");
  CREATE INDEX "fx_snapshots_created_at_idx" ON "fx_snapshots" USING btree ("created_at");
  CREATE INDEX "landing_pages_faq_order_idx" ON "landing_pages_faq" USING btree ("_order");
  CREATE INDEX "landing_pages_faq_parent_id_idx" ON "landing_pages_faq" USING btree ("_parent_id");
  CREATE INDEX "landing_pages_faq_locale_idx" ON "landing_pages_faq" USING btree ("_locale");
  CREATE UNIQUE INDEX "landing_pages_slug_idx" ON "landing_pages" USING btree ("slug");
  CREATE INDEX "landing_pages_combo_combo_destination_idx" ON "landing_pages" USING btree ("combo_destination_id");
  CREATE INDEX "landing_pages_updated_at_idx" ON "landing_pages" USING btree ("updated_at");
  CREATE INDEX "landing_pages_created_at_idx" ON "landing_pages" USING btree ("created_at");
  CREATE INDEX "landing_pages__status_idx" ON "landing_pages" USING btree ("_status");
  CREATE UNIQUE INDEX "landing_pages_locales_locale_parent_id_unique" ON "landing_pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_pages_v_version_faq_order_idx" ON "_landing_pages_v_version_faq" USING btree ("_order");
  CREATE INDEX "_landing_pages_v_version_faq_parent_id_idx" ON "_landing_pages_v_version_faq" USING btree ("_parent_id");
  CREATE INDEX "_landing_pages_v_version_faq_locale_idx" ON "_landing_pages_v_version_faq" USING btree ("_locale");
  CREATE INDEX "_landing_pages_v_parent_idx" ON "_landing_pages_v" USING btree ("parent_id");
  CREATE INDEX "_landing_pages_v_version_version_slug_idx" ON "_landing_pages_v" USING btree ("version_slug");
  CREATE INDEX "_landing_pages_v_version_combo_version_combo_destination_idx" ON "_landing_pages_v" USING btree ("version_combo_destination_id");
  CREATE INDEX "_landing_pages_v_version_version_updated_at_idx" ON "_landing_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_landing_pages_v_version_version_created_at_idx" ON "_landing_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_landing_pages_v_version_version__status_idx" ON "_landing_pages_v" USING btree ("version__status");
  CREATE INDEX "_landing_pages_v_created_at_idx" ON "_landing_pages_v" USING btree ("created_at");
  CREATE INDEX "_landing_pages_v_updated_at_idx" ON "_landing_pages_v" USING btree ("updated_at");
  CREATE INDEX "_landing_pages_v_snapshot_idx" ON "_landing_pages_v" USING btree ("snapshot");
  CREATE INDEX "_landing_pages_v_published_locale_idx" ON "_landing_pages_v" USING btree ("published_locale");
  CREATE INDEX "_landing_pages_v_latest_idx" ON "_landing_pages_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_landing_pages_v_locales_locale_parent_id_unique" ON "_landing_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "taxonomies_slug_idx" ON "taxonomies" USING btree ("slug");
  CREATE INDEX "taxonomies_updated_at_idx" ON "taxonomies" USING btree ("updated_at");
  CREATE INDEX "taxonomies_created_at_idx" ON "taxonomies" USING btree ("created_at");
  CREATE UNIQUE INDEX "taxonomies_locales_locale_parent_id_unique" ON "taxonomies_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");
  CREATE INDEX "articles_hero_image_idx" ON "articles" USING btree ("hero_image_id");
  CREATE INDEX "articles_author_idx" ON "articles" USING btree ("author_id");
  CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");
  CREATE INDEX "articles_updated_at_idx" ON "articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");
  CREATE INDEX "articles__status_idx" ON "articles" USING btree ("_status");
  CREATE UNIQUE INDEX "articles_locales_locale_parent_id_unique" ON "articles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_articles_v_parent_idx" ON "_articles_v" USING btree ("parent_id");
  CREATE INDEX "_articles_v_version_version_slug_idx" ON "_articles_v" USING btree ("version_slug");
  CREATE INDEX "_articles_v_version_version_hero_image_idx" ON "_articles_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_articles_v_version_version_author_idx" ON "_articles_v" USING btree ("version_author_id");
  CREATE INDEX "_articles_v_version_version_published_at_idx" ON "_articles_v" USING btree ("version_published_at");
  CREATE INDEX "_articles_v_version_version_updated_at_idx" ON "_articles_v" USING btree ("version_updated_at");
  CREATE INDEX "_articles_v_version_version_created_at_idx" ON "_articles_v" USING btree ("version_created_at");
  CREATE INDEX "_articles_v_version_version__status_idx" ON "_articles_v" USING btree ("version__status");
  CREATE INDEX "_articles_v_created_at_idx" ON "_articles_v" USING btree ("created_at");
  CREATE INDEX "_articles_v_updated_at_idx" ON "_articles_v" USING btree ("updated_at");
  CREATE INDEX "_articles_v_snapshot_idx" ON "_articles_v" USING btree ("snapshot");
  CREATE INDEX "_articles_v_published_locale_idx" ON "_articles_v" USING btree ("published_locale");
  CREATE INDEX "_articles_v_latest_idx" ON "_articles_v" USING btree ("latest");
  CREATE INDEX "_articles_v_autosave_idx" ON "_articles_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_articles_v_locales_locale_parent_id_unique" ON "_articles_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_snapshot_idx" ON "_pages_v" USING btree ("snapshot");
  CREATE INDEX "_pages_v_published_locale_idx" ON "_pages_v" USING btree ("published_locale");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_pages_v_locales_locale_parent_id_unique" ON "_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");
  CREATE INDEX "audit_logs_target_collection_idx" ON "audit_logs" USING btree ("target_collection");
  CREATE INDEX "audit_logs_target_id_idx" ON "audit_logs" USING btree ("target_id");
  CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");
  CREATE INDEX "audit_logs_agency_idx" ON "audit_logs" USING btree ("agency_id");
  CREATE INDEX "audit_logs_updated_at_idx" ON "audit_logs" USING btree ("updated_at");
  CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
  CREATE INDEX "import_jobs_agency_idx" ON "import_jobs" USING btree ("agency_id");
  CREATE INDEX "import_jobs_status_idx" ON "import_jobs" USING btree ("status");
  CREATE INDEX "import_jobs_updated_at_idx" ON "import_jobs" USING btree ("updated_at");
  CREATE INDEX "import_jobs_created_at_idx" ON "import_jobs" USING btree ("created_at");
  CREATE INDEX "consent_records_ip_hash_idx" ON "consent_records" USING btree ("ip_hash");
  CREATE INDEX "consent_records_updated_at_idx" ON "consent_records" USING btree ("updated_at");
  CREATE INDEX "consent_records_created_at_idx" ON "consent_records" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_members_id_idx" ON "payload_locked_documents_rels" USING btree ("members_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("documents_id");
  CREATE INDEX "payload_locked_documents_rels_properties_id_idx" ON "payload_locked_documents_rels" USING btree ("properties_id");
  CREATE INDEX "payload_locked_documents_rels_agencies_id_idx" ON "payload_locked_documents_rels" USING btree ("agencies_id");
  CREATE INDEX "payload_locked_documents_rels_agents_id_idx" ON "payload_locked_documents_rels" USING btree ("agents_id");
  CREATE INDEX "payload_locked_documents_rels_markets_id_idx" ON "payload_locked_documents_rels" USING btree ("markets_id");
  CREATE INDEX "payload_locked_documents_rels_enquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("enquiries_id");
  CREATE INDEX "payload_locked_documents_rels_saved_listings_id_idx" ON "payload_locked_documents_rels" USING btree ("saved_listings_id");
  CREATE INDEX "payload_locked_documents_rels_requirements_id_idx" ON "payload_locked_documents_rels" USING btree ("requirements_id");
  CREATE INDEX "payload_locked_documents_rels_member_activity_id_idx" ON "payload_locked_documents_rels" USING btree ("member_activity_id");
  CREATE INDEX "payload_locked_documents_rels_reports_id_idx" ON "payload_locked_documents_rels" USING btree ("reports_id");
  CREATE INDEX "payload_locked_documents_rels_fx_snapshots_id_idx" ON "payload_locked_documents_rels" USING btree ("fx_snapshots_id");
  CREATE INDEX "payload_locked_documents_rels_landing_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("landing_pages_id");
  CREATE INDEX "payload_locked_documents_rels_taxonomies_id_idx" ON "payload_locked_documents_rels" USING btree ("taxonomies_id");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_locked_documents_rels_audit_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_logs_id");
  CREATE INDEX "payload_locked_documents_rels_import_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("import_jobs_id");
  CREATE INDEX "payload_locked_documents_rels_consent_records_id_idx" ON "payload_locked_documents_rels" USING btree ("consent_records_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_rels_members_id_idx" ON "payload_preferences_rels" USING btree ("members_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "members_sessions" CASCADE;
  DROP TABLE "members" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "documents" CASCADE;
  DROP TABLE "properties_features" CASCADE;
  DROP TABLE "properties_highlights" CASCADE;
  DROP TABLE "properties" CASCADE;
  DROP TABLE "properties_locales" CASCADE;
  DROP TABLE "properties_rels" CASCADE;
  DROP TABLE "_properties_v_version_features" CASCADE;
  DROP TABLE "_properties_v_version_highlights" CASCADE;
  DROP TABLE "_properties_v" CASCADE;
  DROP TABLE "_properties_v_locales" CASCADE;
  DROP TABLE "_properties_v_rels" CASCADE;
  DROP TABLE "agencies_languages" CASCADE;
  DROP TABLE "agencies" CASCADE;
  DROP TABLE "agencies_locales" CASCADE;
  DROP TABLE "agents_languages" CASCADE;
  DROP TABLE "agents" CASCADE;
  DROP TABLE "markets" CASCADE;
  DROP TABLE "markets_locales" CASCADE;
  DROP TABLE "enquiries" CASCADE;
  DROP TABLE "saved_listings" CASCADE;
  DROP TABLE "requirements_property_types" CASCADE;
  DROP TABLE "requirements_must_have_features" CASCADE;
  DROP TABLE "requirements" CASCADE;
  DROP TABLE "requirements_rels" CASCADE;
  DROP TABLE "member_activity" CASCADE;
  DROP TABLE "reports_authors" CASCADE;
  DROP TABLE "reports" CASCADE;
  DROP TABLE "reports_locales" CASCADE;
  DROP TABLE "reports_rels" CASCADE;
  DROP TABLE "_reports_v_version_authors" CASCADE;
  DROP TABLE "_reports_v" CASCADE;
  DROP TABLE "_reports_v_locales" CASCADE;
  DROP TABLE "_reports_v_rels" CASCADE;
  DROP TABLE "fx_snapshots" CASCADE;
  DROP TABLE "landing_pages_faq" CASCADE;
  DROP TABLE "landing_pages" CASCADE;
  DROP TABLE "landing_pages_locales" CASCADE;
  DROP TABLE "_landing_pages_v_version_faq" CASCADE;
  DROP TABLE "_landing_pages_v" CASCADE;
  DROP TABLE "_landing_pages_v_locales" CASCADE;
  DROP TABLE "taxonomies" CASCADE;
  DROP TABLE "taxonomies_locales" CASCADE;
  DROP TABLE "articles" CASCADE;
  DROP TABLE "articles_locales" CASCADE;
  DROP TABLE "_articles_v" CASCADE;
  DROP TABLE "_articles_v_locales" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_locales" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_locales" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "audit_logs" CASCADE;
  DROP TABLE "import_jobs" CASCADE;
  DROP TABLE "consent_records" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_members_preferred_locale";
  DROP TYPE "public"."enum_members_member_type";
  DROP TYPE "public"."enum_members_status";
  DROP TYPE "public"."enum_members_source";
  DROP TYPE "public"."enum_media_visibility";
  DROP TYPE "public"."enum_documents_document_type";
  DROP TYPE "public"."enum_properties_features";
  DROP TYPE "public"."enum_properties_property_type";
  DROP TYPE "public"."enum_properties_price_type";
  DROP TYPE "public"."enum_properties_currency";
  DROP TYPE "public"."enum_properties_tenure";
  DROP TYPE "public"."enum_properties_ownership_structure";
  DROP TYPE "public"."enum_properties_sale_structure";
  DROP TYPE "public"."enum_properties_mandate_type";
  DROP TYPE "public"."enum_properties_heritage_status";
  DROP TYPE "public"."enum_properties_condition";
  DROP TYPE "public"."enum_properties_waterfront_water_body_type";
  DROP TYPE "public"."enum_properties_waterfront_mooring_type";
  DROP TYPE "public"."enum_properties_location_coordinate_precision";
  DROP TYPE "public"."enum_properties_location_public_geography";
  DROP TYPE "public"."enum_properties_publication";
  DROP TYPE "public"."enum_properties_channel";
  DROP TYPE "public"."enum_properties_price_disclosure";
  DROP TYPE "public"."enum_properties_value_tier";
  DROP TYPE "public"."listing_status";
  DROP TYPE "public"."enum_properties_moderation";
  DROP TYPE "public"."enum_properties_source_type";
  DROP TYPE "public"."enum_properties_status";
  DROP TYPE "public"."enum__properties_v_version_features";
  DROP TYPE "public"."enum__properties_v_version_property_type";
  DROP TYPE "public"."enum__properties_v_version_price_type";
  DROP TYPE "public"."enum__properties_v_version_currency";
  DROP TYPE "public"."enum__properties_v_version_tenure";
  DROP TYPE "public"."enum__properties_v_version_ownership_structure";
  DROP TYPE "public"."enum__properties_v_version_sale_structure";
  DROP TYPE "public"."enum__properties_v_version_mandate_type";
  DROP TYPE "public"."enum__properties_v_version_heritage_status";
  DROP TYPE "public"."enum__properties_v_version_condition";
  DROP TYPE "public"."enum__properties_v_version_waterfront_water_body_type";
  DROP TYPE "public"."enum__properties_v_version_waterfront_mooring_type";
  DROP TYPE "public"."enum__properties_v_version_location_coordinate_precision";
  DROP TYPE "public"."enum__properties_v_version_location_public_geography";
  DROP TYPE "public"."enum__properties_v_version_publication";
  DROP TYPE "public"."enum__properties_v_version_channel";
  DROP TYPE "public"."enum__properties_v_version_price_disclosure";
  DROP TYPE "public"."enum__properties_v_version_value_tier";
  DROP TYPE "public"."enum__properties_v_version_moderation";
  DROP TYPE "public"."enum__properties_v_version_source_type";
  DROP TYPE "public"."enum__properties_v_version_status";
  DROP TYPE "public"."enum__properties_v_published_locale";
  DROP TYPE "public"."enum_agencies_languages";
  DROP TYPE "public"."enum_agencies_tier";
  DROP TYPE "public"."enum_agencies_feed_feed_format";
  DROP TYPE "public"."enum_agents_languages";
  DROP TYPE "public"."enum_markets_stats_transaction_volume_band_value";
  DROP TYPE "public"."enum_enquiries_locale";
  DROP TYPE "public"."enum_enquiries_source";
  DROP TYPE "public"."enum_enquiries_status";
  DROP TYPE "public"."enum_requirements_property_types";
  DROP TYPE "public"."enum_requirements_must_have_features";
  DROP TYPE "public"."enum_requirements_currency";
  DROP TYPE "public"."enum_requirements_timeline";
  DROP TYPE "public"."enum_requirements_status";
  DROP TYPE "public"."enum_member_activity_action";
  DROP TYPE "public"."enum_reports_status";
  DROP TYPE "public"."enum__reports_v_version_status";
  DROP TYPE "public"."enum__reports_v_published_locale";
  DROP TYPE "public"."enum_landing_pages_combo_property_type";
  DROP TYPE "public"."enum_landing_pages_combo_water_body_type";
  DROP TYPE "public"."enum_landing_pages_status";
  DROP TYPE "public"."enum__landing_pages_v_version_combo_property_type";
  DROP TYPE "public"."enum__landing_pages_v_version_combo_water_body_type";
  DROP TYPE "public"."enum__landing_pages_v_version_status";
  DROP TYPE "public"."enum__landing_pages_v_published_locale";
  DROP TYPE "public"."enum_taxonomies_group";
  DROP TYPE "public"."enum_articles_status";
  DROP TYPE "public"."enum__articles_v_version_status";
  DROP TYPE "public"."enum__articles_v_published_locale";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum__pages_v_published_locale";
  DROP TYPE "public"."enum_redirects_status_code";
  DROP TYPE "public"."enum_audit_logs_action";
  DROP TYPE "public"."enum_import_jobs_kind";
  DROP TYPE "public"."enum_import_jobs_status";`)
}
