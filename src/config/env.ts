import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PAYLOAD_SECRET: z.string().min(16, 'PAYLOAD_SECRET must be at least 16 chars'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(['en', 'it', 'fr', 'de', 'es', 'ru']).default('en'),
  TYPESENSE_HOST: z.string().default('localhost'),
  TYPESENSE_PORT: z.string().default('8108'),
  TYPESENSE_PROTOCOL: z.string().default('http'),
  TYPESENSE_API_KEY: z.string().default('devkey'),
  TYPESENSE_SEARCH_ONLY_KEY: z.string().default('devkey_search'),
  TYPESENSE_PUBLIC_SEARCH_KEY: z.string().optional(),
  TYPESENSE_MEMBER_SEARCH_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional().default('re_dev_key'),
  LEAD_NOTIFY_TO: z.string().email().default('leads@lawrenceprivatecollection.com'),
  AGENCY_NOTIFY_FROM: z.string().default('noreply@lawrenceprivatecollection.com'),
  REVALIDATE_SECRET: z.string().default('dev_revalidate_secret_key'),
  CRON_SECRET: z.string().default('dev_cron_secret_key'),
  FEED_INGEST_SECRET: z.string().default('dev_feed_ingest_secret'),
  SAMPLE_DATA_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  MEMBER_REQUIRE_APPROVAL: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  SIGNED_URL_SECRET: z.string().optional(),
  MAGIC_LINK_SECRET: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  NEXT_PUBLIC_CF_IMAGES_URL: z.string().optional(),
  NEXT_PUBLIC_MAPTILER_KEY: z.string().optional(),
  FX_API_URL: z.string().optional().default('https://api.frankfurter.app'),
  UNSPLASH_ACCESS_KEY: z.string().optional(),
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  return result.data;
}

export const env = parseEnv();
