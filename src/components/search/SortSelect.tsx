'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface SortSelectProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  current: string;
}

/** Sort control writing `sort` into the shareable URL (§5.5). */
export function SortSelect({ label, options, current }: SortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const query = new URLSearchParams(searchParams.toString());
    if (value === 'newest') query.delete('sort');
    else query.set('sort', value);
    query.delete('page');
    const str = query.toString();
    // push, not replace: sort changes are filter-state changes and must
    // survive back/forward (§10.2 acceptance).
    router.push(`${pathname}${str ? `?${str}` : ''}`);
  }

  return (
    <label className="inline-flex items-center gap-2 text-xs text-graphite">
      <span className="uppercase tracking-[0.14em]">{label}</span>
      <select
        value={current}
        onChange={(event) => onChange(event.target.value)}
        className="py-1.5 rounded-sm border border-line bg-vellum px-2 text-xs text-ink"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
