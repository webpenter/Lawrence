import { checkAdmission } from '@/collections/Property/validation';

/**
 * Automated moderation pre-checks (§9.4). Pure: anything flagged goes to a
 * human; a clean result from a verified-tier agency auto-approves.
 * The coastline-polygon proximity check needs the Natural Earth/OSM water
 * dataset and lands with the moderation-queue UI (see DECISIONS.md) —
 * coordinate sanity is checked here, water proximity is not yet.
 */

export interface PreCheckInput {
  coordinates?: [number, number] | null;
  priceEur?: number | null;
  internalValueEur?: number | null;
  valueTier?: 'prime' | 'trophy' | 'signature' | null;
  imageCount: number;
  descriptionText: string;
  title: string;
  /** Set when the import fingerprint matched another agency's listing. */
  duplicateOf?: number | string | null;
}

export interface PreCheckContext {
  /** Median priceEur for the listing's destination, when known. */
  destinationMedianEur?: number | null;
}

export interface PreCheckFlag {
  code: string;
  message: string;
}

const PHONE_PATTERN = /\+?\d[\d\s().-]{7,}\d/;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.]+/;

export function runPreChecks(input: PreCheckInput, context: PreCheckContext = {}): PreCheckFlag[] {
  const flags: PreCheckFlag[] = [];

  const admission = checkAdmission({
    internalValueEur: input.internalValueEur,
    priceEur: input.priceEur,
    valueTier: input.valueTier ?? undefined,
  });
  if (!admission.ok) flags.push({ code: 'admission', message: admission.reason as string });

  const coords = input.coordinates;
  if (!coords) {
    flags.push({ code: 'coordinates_missing', message: 'No coordinates supplied.' });
  } else {
    const [lng, lat] = coords;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) {
      flags.push({ code: 'coordinates_implausible', message: 'Coordinates are outside plausible bounds.' });
    }
  }

  const median = context.destinationMedianEur;
  if (input.priceEur != null && median != null && median > 0) {
    const ratio = input.priceEur / median;
    if (ratio > 5 || ratio < 0.2) {
      flags.push({
        code: 'price_outlier',
        message: `Price is ${ratio.toFixed(1)}× the destination median — confirm it is not a data-entry error.`,
      });
    }
  }

  // §9.4: ≥8 images at ≥2000px. The 2000px long edge and EXIF stripping are
  // enforced structurally at upload (Media.ts refuses smaller/unstripped
  // files), so the queue only needs the count here.
  if (input.imageCount < 8) {
    flags.push({ code: 'too_few_images', message: `${input.imageCount} images; minimum is 8.` });
  }

  if (input.descriptionText.trim().length < 600) {
    flags.push({
      code: 'description_too_short',
      message: `Description is ${input.descriptionText.trim().length} characters; minimum is 600.`,
    });
  }

  if (input.duplicateOf != null) {
    flags.push({
      code: 'duplicate_fingerprint',
      message: `Fingerprint matches listing #${input.duplicateOf} from another agency.`,
    });
  }

  if (PHONE_PATTERN.test(input.descriptionText) || EMAIL_PATTERN.test(input.descriptionText)) {
    flags.push({
      code: 'contact_in_description',
      message: 'Public descriptions may not contain phone numbers or email addresses.',
    });
  }

  const letters = input.title.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 6) {
    const upper = letters.replace(/[^A-Z]/g, '').length;
    if (upper / letters.length > 0.6) {
      flags.push({ code: 'all_caps_title', message: 'Titles may not be written in ALL CAPS.' });
    }
  }

  return flags;
}

/** Plain text out of a lexical rich-text value, for length/content checks. */
export function lexicalToText(value: unknown): string {
  if (value == null) return '';
  const chunks: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (typeof node !== 'object' || node === null) return;
    const record = node as Record<string, unknown>;
    if (typeof record.text === 'string') chunks.push(record.text);
    if (record.children) walk(record.children);
    if (record.root) walk(record.root);
  };
  walk(value);
  return chunks.join(' ');
}
