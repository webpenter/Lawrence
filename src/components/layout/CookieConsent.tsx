'use client';

import { useEffect, useState } from 'react';

export const CONSENT_COOKIE = 'lpc_consent';

interface CookieConsentLabels {
  title: string;
  description: string;
  acceptAll: string;
  necessaryOnly: string;
  customize: string;
  save: string;
  analytics: string;
  marketing: string;
}

interface CookieConsentProps {
  labels: CookieConsentLabels;
  locale: string;
}

function hasDecision(): boolean {
  return document.cookie.split('; ').some((row) => row.startsWith(`${CONSENT_COOKIE}=`));
}

/**
 * §4 decision 7: no cookie wall before LCP. The banner is deferred (renders
 * nothing until well after hydration), fixed-position (zero layout shift by
 * construction) and granular. The decision lands in a one-year cookie and a
 * server-side consent record.
 */
export function CookieConsent({ labels, locale }: CookieConsentProps) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (hasDecision()) return;
    // Deferred: never competes with LCP or hydration.
    const timer = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  function decide(nextAnalytics: boolean, nextMarketing: boolean) {
    const value = encodeURIComponent(
      JSON.stringify({ analytics: nextAnalytics, marketing: nextMarketing, ts: Date.now() }),
    );
    document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
    setVisible(false);
    void fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analytics: nextAnalytics, marketing: nextMarketing, locale }),
      keepalive: true,
    }).catch(() => undefined);
  }

  if (!visible) return null;

  return (
    <aside
      role="region"
      aria-label={labels.title}
      className="fixed inset-x-3 bottom-3 z-toast mx-auto max-w-xl border border-line bg-vellum p-5 shadow-pop"
    >
      <h2 className="mb-1 font-display text-base text-ink">{labels.title}</h2>
      <p className="mb-4 text-xs leading-relaxed text-graphite">{labels.description}</p>

      {expanded ? (
        <div className="mb-4 flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs text-ink">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
            />
            {labels.analytics}
          </label>
          <label className="flex items-center gap-2 text-xs text-ink">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(event) => setMarketing(event.target.checked)}
            />
            {labels.marketing}
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => decide(true, true)}
          className="bg-obsidian px-4 py-2.5 text-xs uppercase tracking-[0.14em] text-vellum"
        >
          {labels.acceptAll}
        </button>
        {expanded ? (
          <button
            type="button"
            onClick={() => decide(analytics, marketing)}
            className="border border-obsidian px-4 py-2.5 text-xs uppercase tracking-[0.14em] text-obsidian"
          >
            {labels.save}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => decide(false, false)}
            className="border border-obsidian px-4 py-2.5 text-xs uppercase tracking-[0.14em] text-obsidian"
          >
            {labels.necessaryOnly}
          </button>
        )}
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-xs text-patina underline-offset-2 hover:underline"
          >
            {labels.customize}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
