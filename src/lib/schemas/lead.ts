import { z } from 'zod';

/**
 * The enquiry intake contract, shared client/server (CLAUDE.md conventions:
 * Zod schemas colocated in /src/lib/schemas). The client validates before
 * POSTing; the /api/enquiry route re-validates authoritatively.
 */
export const leadSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(50).optional(),
  message: z.string().max(5000).optional(),
  /** Absent for contact/sell/desk enquiries — routed to the desk (§11.8). */
  propertyId: z.number().int().positive().optional(),
  source: z
    .enum(['listing', 'off_market', 'market_page', 'report', 'contact', 'sell', 'desk_call'])
    .default('listing'),
  consent: z.literal(true),
  locale: z.enum(['en', 'it', 'fr', 'de', 'es', 'ru']).optional(),
  /** Honeypot — humans never see it; any value means a bot. */
  website: z.string().max(0).optional(),
  /** Anti-bot timing check: epoch ms when the form was rendered. */
  startedAt: z.number().int().positive().optional(),
  /** §22-11A: UTM parameters captured from the landing URL. */
  utm: z.record(z.string(), z.string().max(200)).optional(),
  turnstileToken: z.string().max(4000).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

/** Minimum humanly-plausible time between form render and submit. */
export const MIN_FILL_MS = 3000;
