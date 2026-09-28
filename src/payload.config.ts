import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

import { Users } from './collections/Users/index';
import { Media } from './collections/Media';
import { Property } from './collections/Property';
import { Agency } from './collections/Agency';
import { Agent } from './collections/Agent';
import { Members } from './collections/Members/index';
import { Market } from './collections/Market';
import { Enquiry } from './collections/Enquiry';
import { SavedListing } from './collections/SavedListing';
import { Requirement } from './collections/Requirement';
import { MemberActivity } from './collections/MemberActivity';
import { Report } from './collections/Report';
import { Documents } from './collections/Documents';
import { FxSnapshot } from './collections/FxSnapshot';
import { LandingPage } from './collections/LandingPage';
import { Taxonomy } from './collections/Taxonomy';
import { Article } from './collections/Article';
import { Page } from './collections/Page';
import { Redirect } from './collections/Redirect';
import { AuditLog } from './collections/AuditLog';
import { ConsentRecord } from './collections/ConsentRecord';
import { ImportJob } from './collections/ImportJob';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: '- Lawrence Backoffice',
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  localization: {
    locales: ['en', 'it', 'fr', 'de', 'es', 'ru'],
    defaultLocale: 'en',
    fallback: true,
  },
  collections: [
    Users,
    Members,
    Media,
    Documents,
    Property,
    Agency,
    Agent,
    Market,
    Enquiry,
    SavedListing,
    Requirement,
    MemberActivity,
    Report,
    FxSnapshot,
    LandingPage,
    Taxonomy,
    Article,
    Page,
    Redirect,
    AuditLog,
    ImportJob,
    ConsentRecord,
  ],
  editor: lexicalEditor({}),
  secret: process.env['PAYLOAD_SECRET'] || 'dev_secret_change_me_in_production_min_32_chars',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString:
        process.env['DATABASE_URL'] ||
        'postgresql://postgres:lawrence_dev_password@localhost:5432/lawrence',
      // Generous connect timeout: a cold Vercel serverless function dialing a
      // cross-region Supabase pooler can take several seconds. 3s (a sandbox
      // fail-fast value) was exceeded on cold connects, so getPropertyForDetail
      // threw → the page fell back to notFound() → a 404 got ISR-cached for
      // 10 min. Overridable via DB_CONNECT_TIMEOUT_MS.
      connectionTimeoutMillis: Number(process.env['DB_CONNECT_TIMEOUT_MS'] ?? 15000),
      // Serverless: keep the per-instance pool small so concurrent invocations
      // don't exhaust the pooler's client limit.
      max: Number(process.env['DB_POOL_MAX'] ?? 5),
    },
    // Production never auto-pushes schema (Payload only pushes in dev):
    // committed migrations in src/migrations are applied by
    // `pnpm payload:migrate` during the Vercel build (runbooks/deploy.md §0.6).
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
});
