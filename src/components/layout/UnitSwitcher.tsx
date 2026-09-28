'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  DEFAULT_UNITS,
  isUnitSystem,
  UNITS_COOKIE,
  type UnitSystem,
} from '@/lib/intl/format';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

interface UnitSwitcherProps {
  label: string;
  metricLabel: string;
  imperialLabel: string;
  dark?: boolean;
}

/** Metric/imperial preference, stored in a cookie (spec Prompt 6). */
export function UnitSwitcher({
  label,
  metricLabel,
  imperialLabel,
  dark = false,
}: UnitSwitcherProps) {
  const router = useRouter();
  const [units, setUnits] = useState<UnitSystem>(() => {
    const stored = readCookie(UNITS_COOKIE);
    return isUnitSystem(stored) ? stored : DEFAULT_UNITS;
  });

  function onChange(next: string) {
    if (!isUnitSystem(next)) return;
    setUnits(next);
    document.cookie = `${UNITS_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
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
        value={units}
        onChange={(event) => onChange(event.target.value)}
        className={`cursor-pointer text-xs font-medium transition-colors ${
          dark
            ? 'appearance-none border-0 bg-transparent p-0 uppercase tracking-[0.16em] text-vellum hover:text-vellum/80'
            : 'py-1.5 rounded border border-line bg-vellum px-2 text-ink'
        }`}
      >
        <option value="metric" className="bg-obsidian text-vellum">
          {metricLabel}
        </option>
        <option value="imperial" className="bg-obsidian text-vellum">
          {imperialLabel}
        </option>
      </select>
    </label>
  );
}
