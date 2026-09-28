'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CURRENCIES, type Currency } from '@/collections/Property/enums';
import { trackEvent } from '@/lib/analytics';
import { CURRENCY_COOKIE, DEFAULT_CURRENCY, isCurrency } from '@/lib/intl/format';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

/** EUR-default currency preference, stored in a cookie (spec Prompt 6). */
export function CurrencySwitcher({ label, dark = false }: { label: string; dark?: boolean }) {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>(() => {
    const stored = readCookie(CURRENCY_COOKIE);
    return isCurrency(stored) ? stored : DEFAULT_CURRENCY;
  });

  function onChange(next: string) {
    if (!isCurrency(next)) return;
    trackEvent('currency_switched', { from: currency, to: next });
    setCurrency(next);
    document.cookie = `${CURRENCY_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
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
        value={currency}
        onChange={(event) => onChange(event.target.value)}
        className={`cursor-pointer text-xs font-medium transition-colors ${
          dark
            ? 'appearance-none border-0 bg-transparent p-0 uppercase tracking-[0.16em] text-vellum hover:text-vellum/80'
            : 'py-1.5 rounded border border-line bg-vellum px-2 text-ink'
        }`}
      >
        {CURRENCIES.map((code) => (
          <option key={code} value={code} className="bg-obsidian text-vellum">
            {code}
          </option>
        ))}
      </select>
    </label>
  );
}
