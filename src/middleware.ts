import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import { DEFAULT_LOCALE, LOCALES, routing, type AppLocale } from './i18n/routing';
import { applySecurityHeaders } from './lib/security/headers';

const intlMiddleware = createIntlMiddleware(routing);

function detectLocale(request: NextRequest): AppLocale {
  const header = request.headers.get('accept-language') ?? '';
  for (const part of header.split(',')) {
    const code = part.split(';')[0]?.trim().slice(0, 2).toLowerCase();
    if (LOCALES.includes(code as AppLocale)) return code as AppLocale;
  }
  return DEFAULT_LOCALE;
}

// §14.5/§8.7: expired listing URLs answer 410 Gone; changed slugs 301 to the
// new URL. Redirect records are looked up through the cached /api/gone route
// and memoised per instance.
const PROPERTY_PATH = /^\/(en|it|fr|de|es|ru)(\/property\/[^/]+)$/;

interface RedirectDecision {
  statusCode: string | null;
  to: string | null;
}
const redirectCache = new Map<string, { decision: RedirectDecision; at: number }>();
const REDIRECT_TTL_MS = 5 * 60 * 1000;

async function lookupRedirect(request: NextRequest, path: string): Promise<RedirectDecision> {
  const cached = redirectCache.get(path);
  if (cached && Date.now() - cached.at < REDIRECT_TTL_MS) return cached.decision;
  try {
    const res = await fetch(
      `${request.nextUrl.origin}/api/gone?path=${encodeURIComponent(path)}`,
      { signal: AbortSignal.timeout(1500) },
    );
    const decision = (await res.json()) as RedirectDecision;
    redirectCache.set(path, { decision, at: Date.now() });
    return decision;
  } catch {
    return { statusCode: null, to: null };
  }
}

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // §16.1: the admin and API surfaces get the same security headers as the
  // public pages, but none of the locale machinery below. Member/secure APIs
  // are additionally never cached anywhere (§5.3, §8.6).
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    const response = applySecurityHeaders(NextResponse.next());
    if (pathname.startsWith('/api/member') || pathname.startsWith('/api/secure')) {
      response.headers.set('Cache-Control', 'private, no-store');
      response.headers.set('X-Robots-Tag', 'noindex, noimageindex');
    }
    return response;
  }

  // §5.3: member routes are dynamic, noindex and NEVER edge-cached — the
  // header is set here so no downstream cache can ever hold a member page.
  const MEMBER_PATH = /^\/(en|it|fr|de|es|ru)\/(off-market|account)(\/|$)/;
  if (MEMBER_PATH.test(pathname)) {
    const response = (await intlMiddleware(request)) as NextResponse;
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return applySecurityHeaders(response);
  }

  // Spec §5.1: "/" performs a 302 language-detect redirect and is never cached.
  if (request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = `/${detectLocale(request)}`;
    const response = NextResponse.redirect(url, 302);
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Vary', 'Accept-Language');
    return applySecurityHeaders(response);
  }

  const propertyMatch = PROPERTY_PATH.exec(request.nextUrl.pathname);
  if (propertyMatch) {
    const decision = await lookupRedirect(request, propertyMatch[2] as string);
    if (decision.statusCode === '410') {
      const url = request.nextUrl.clone();
      url.pathname = `/${propertyMatch[1]}/gone`;
      return applySecurityHeaders(NextResponse.rewrite(url, { status: 410 }));
    }
    if ((decision.statusCode === '301' || decision.statusCode === '302') && decision.to) {
      const url = request.nextUrl.clone();
      url.pathname = `/${propertyMatch[1]}${decision.to}`;
      return NextResponse.redirect(url, decision.statusCode === '301' ? 301 : 302);
    }
  }

  const response = await intlMiddleware(request);
  return applySecurityHeaders(response as NextResponse);
}

export const config = {
  // Everything except Next internals, dev-only pages, and static files —
  // /admin and /api ARE matched so §16.1 headers cover the whole surface.
  matcher: ['/((?!_next|dev|.*\\..*).*)'],
};
