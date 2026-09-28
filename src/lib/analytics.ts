/**
 * Spec §17: Analytics Event Schema.
 * Plausible custom events foundation for WATERLINE.
 * Strict PII prevention: No personal data (email, phone, name, IP, free text)
 * is ever transmitted in event payloads.
 */

export type AnalyticsEventMap = {
  search_performed: {
    facetsUsed: string[];
    resultCount: number;
    sort?: string;
  };
  filter_applied: {
    filterName: string;
    filterValue: string | number;
  };
  boat_filter_used: {
    loa?: number;
    draft?: number;
    beam?: number;
    resultCount: number;
  };
  map_moved: {
    zoom?: number;
    hasBbox: boolean;
  };
  listing_viewed: {
    propertyId: string | number;
    destination?: string;
    priceBand?: string;
    valueTier?: string;
  };
  gallery_opened: {
    propertyId: string | number;
    photoCount: number;
  };
  brochure_downloaded: {
    propertyId: string | number;
    locale: string;
  };
  lead_submitted: {
    source: string;
    hasPhone: boolean;
    propertyId?: string | number;
    agencyId?: string | number;
  };
  whatsapp_clicked: {
    propertyId?: string | number;
    agencyId?: string | number;
  };
  landing_viewed: {
    comboSlug: string;
  };
  agency_application_started: {
    source?: string;
  };
  agency_application_completed: {
    hasInventoryCount: boolean;
  };
  locale_switched: {
    from: string;
    to: string;
  };
  currency_switched: {
    from: string;
    to: string;
  };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: {
        props?: Record<string, string | number | boolean | undefined | null>;
        callback?: () => void;
      },
    ) => void;
  }
}

/** Patterns that indicate accidental PII in event payloads (§16/§17) */
const PII_REGEXES = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
  /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/, // Phone number
];

/**
 * Validates and scrubs any accidental PII from an event payload before sending.
 */
export function sanitizeAnalyticsProps<T extends Record<string, unknown>>(
  props: T,
): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(props)) {
    if (value == null) continue;

    // Disallow forbidden keys that might carry personal information
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('email') ||
      lowerKey.includes('name') ||
      lowerKey.includes('phone') ||
      lowerKey.includes('message') ||
      lowerKey.includes('address') ||
      lowerKey.includes('password') ||
      lowerKey.includes('secret')
    ) {
      if (key !== 'filterName' && key !== 'hasPhone') {
        console.warn(`[analytics] Dropped potentially sensitive prop: ${key}`);
        continue;
      }
    }

    if (typeof value === 'string') {
      const containsPii = PII_REGEXES.some((regex) => regex.test(value));
      if (containsPii) {
        console.warn(`[analytics] Dropped prop containing PII pattern: ${key}`);
        continue;
      }
      clean[key] = value.slice(0, 100); // Bound string lengths
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value;
    } else if (Array.isArray(value)) {
      clean[key] = value.join(',').slice(0, 100);
    }
  }

  return clean;
}

/**
 * Dispatch a typed analytics event to Plausible.
 * Safe to call client-side or during SSR (no-ops safely on server).
 */
export function trackEvent<E extends AnalyticsEventName>(
  eventName: E,
  props: AnalyticsEventMap[E],
): void {
  if (typeof window === 'undefined') return;

  const sanitizedProps = sanitizeAnalyticsProps(props);

  if (typeof window.plausible === 'function') {
    window.plausible(eventName, { props: sanitizedProps });
  } else if (process.env.NODE_ENV === 'development') {
    console.debug(`[analytics:${eventName}]`, sanitizedProps);
  }
}
