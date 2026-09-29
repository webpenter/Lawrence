'use client';

import { trackEvent } from '@/lib/analytics';

/**
 * §22-11A: the desk's scheduled-call path — a Cal.com link, never an embed
 * (the CSP stays closed) and never a published direct number (§2068).
 */
export function DeskCallLink({
  href,
  locale,
  label,
}: {
  href: string;
  locale: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent('desk_call_scheduled', { locale })}
      className="inline-block border border-ink px-5 py-2.5 text-xs uppercase tracking-[0.14em] text-ink hover:bg-ink hover:text-vellum"
    >
      {label}
    </a>
  );
}
