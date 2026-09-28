/**
 * Consent-gated Plausible loader (§12.2 rule 7, §16.4, §17).
 *
 * Zero client-JS-chunk cost: next/script would pull its runtime into the
 * shared first-load bundle of every route (measured +1.7 kB gz — home went
 * over its 110 kB budget), so this is a ~300-byte inline snippet instead.
 * It injects the Plausible script only after the visitor's stored consent
 * cookie grants analytics (§16.4: analytics only after consent) — reading
 * the cookie client-side keeps every page statically renderable (a
 * server-side cookies() read would force dynamic rendering, CLAUDE.md rule 4).
 */
export function AnalyticsScript() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;

  const loader = `(function(){try{var m=document.cookie.match(/(?:^|; )lpc_consent=([^;]*)/);if(!m)return;var c=JSON.parse(decodeURIComponent(m[1]));if(!c.analytics)return;var s=document.createElement('script');s.defer=true;s.dataset.domain=${JSON.stringify(domain)};s.src='https://plausible.io/js/script.tagged-events.js';document.head.appendChild(s);}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: loader }} />;
}
