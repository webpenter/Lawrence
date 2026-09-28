import { clsx } from 'clsx';

import { formatLength, type UnitSystem } from '@/lib/intl/format';
import type { Property } from '@/payload-types';

/** Humanize an enum slug for display until per-enum translation keys land with the translation pass. */
export function humanizeEnum(value: string): string {
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

interface WaterChipsProps {
  property: Property;
  units: UnitSystem;
  locale: string;
}

/**
 * The card chips row from the design preview. The key chip (tide outline)
 * carries the strongest water credential: frontage first, berth second.
 */
export function WaterChips({ property, units, locale }: WaterChipsProps) {
  const chips: Array<{ label: string; key: boolean }> = [];

  if (property.waterFrontageM != null) {
    chips.push({
      label: `${formatLength(property.waterFrontageM, units, locale)} · frontage`.replace(
        ' · frontage',
        ' frontage',
      ),
      key: true,
    });
  } else if (property.maxBoatLoaM != null) {
    chips.push({
      label: `Berth ${formatLength(property.maxBoatLoaM, units, locale)}`,
      key: true,
    });
  }

  if (property.waterBodyType) {
    chips.push({ label: humanizeEnum(property.waterBodyType), key: false });
  }
  const access = property.waterAccessType?.[0];
  if (access) {
    chips.push({ label: humanizeEnum(access), key: false });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={clsx(
            'border px-2 py-0.5 text-[length:var(--text-xs)] uppercase tracking-[0.1em]',
            chip.key ? 'border-patina text-patina' : 'border-line text-graphite',
          )}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
