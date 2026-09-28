'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import { LOCALES, type AppLocale } from '@/i18n/routing';
import { trackEvent } from '@/lib/analytics';

// Native language names are deliberately untranslated — every reader must be
// able to find their own language.
const LOCALE_LABELS: Record<AppLocale, string> = {
  en: 'English',
  it: 'Italiano',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  ru: 'Русский',
};

interface LocaleSwitcherProps {
  label: string;
  currentLocale: string;
  dark?: boolean;
}

/**
 * Switches locale while preserving the current path and query string
 * (spec Prompt 6). Swaps the /{locale}/ prefix directly so no intl runtime
 * ships to the client. Localized landing-page slug mapping plugs in here once
 * landing pages exist (Prompt 10).
 */
export function LocaleSwitcher({ label, currentLocale, dark = false }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  function onChange(next: string) {
    trackEvent('locale_switched', { from: currentLocale, to: next });
    const segments = pathname.split('/');
    segments[1] = next;
    const query = searchParams.toString();
    const target = `${segments.join('/') || `/${next}`}${query ? `?${query}` : ''}`;
    startTransition(() => {
      router.replace(target);
    });
  }

  return (
    <label
      className={`inline-flex items-center gap-2 text-xs uppercase tracking-wider ${
        dark ? 'text-vellum' : 'text-graphite'
      }`}
    >
      {/* Footer (dark) shows only the value, preview-style; the label stays for AT. */}
      <span className={dark ? 'sr-only' : undefined}>{label}</span>
      <select
        value={currentLocale}
        onChange={(event) => onChange(event.target.value)}
        className={`cursor-pointer text-xs font-medium transition-colors ${
          dark
            ? 'appearance-none border-0 bg-transparent p-0 uppercase tracking-[0.16em] text-vellum hover:text-vellum/80'
            : 'py-1.5 rounded border border-line bg-vellum px-2 text-ink'
        }`}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code} className="bg-obsidian text-vellum">
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
