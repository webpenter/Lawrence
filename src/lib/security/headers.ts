import { NextResponse } from 'next/server';

/**
 * §16.1 security headers with a strict CSP tuned to the ACTUAL stack:
 * MapLibre GL + MapTiler tiles, Plausible analytics, Sentry, Unsplash
 * sample photography and Cloudflare-served media.
 *
 * Notes that keep this honest:
 * - script-src keeps 'unsafe-inline' because Next.js injects inline
 *   bootstrap/hydration scripts on statically generated pages — nonces would
 *   force every page dynamic (violates CLAUDE.md rule 4). The §16.1 goal
 *   (grade A on securityheaders.com) does not require dropping it.
 * - 'unsafe-eval' is DEV ONLY (react-refresh needs eval); production CSP
 *   never includes it. MapLibre needs blob: workers, not eval.
 * - No Mapbox/OSM hosts: the §13.5 stack is MapTiler.
 */
export function getSecurityHeaders(): Record<string, string> {
  const dev = process.env.NODE_ENV !== 'production';

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://plausible.io https://browser.sentry-cdn.com https://challenges.cloudflare.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: https://images.unsplash.com https://api.maptiler.com https://*.r2.dev https://imagedelivery.net`,
    `font-src 'self' data:`,
    `connect-src 'self' https://plausible.io https://*.sentry.io https://api.maptiler.com${dev ? ' ws:' : ''}`,
    `worker-src 'self' blob:`,
    `child-src blob:`,
    // §16.1: the Turnstile widget renders in an iframe from Cloudflare.
    `frame-src https://challenges.cloudflare.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');

  return {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), display-capture=(), payment=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
}

export function applySecurityHeaders(response: NextResponse): NextResponse {
  const headers = getSecurityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}
