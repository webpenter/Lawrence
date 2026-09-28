import { getLocale, getTranslations } from 'next-intl/server';

import { humanizeEnum } from '@/components/property/WaterChips';
import { formatLength } from '@/lib/intl/format';
import { getViewerPreferences } from '@/lib/intl/preferences';
import type { Property } from '@/payload-types';

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 py-2 text-xs ${last ? '' : 'border-b border-line'}`}
    >
      <span className="tracking-[0.04em] text-graphite">{label}</span>
      {/* flex-wrap: short values sit on the label's line (justified right); long
          values reflow onto their own full-width line instead of squeezing. */}
      <b className="font-medium tabular-nums text-ink [overflow-wrap:anywhere] sm:text-right">
        {value}
      </b>
    </div>
  );
}

/**
 * The Water credentials table (§10.3) — the first signature block of the
 * product. Sits above the description, never below; heavy ink top rule per
 * the design preview. Only populated fields render.
 */
export async function WaterCredentialsTable({ property }: { property: Property }) {
  const t = await getTranslations('listing');
  const locale = await getLocale();
  const { units } = await getViewerPreferences();

  const waterBodyName =
    typeof property.waterBody === 'object' && property.waterBody !== null
      ? property.waterBody.name
      : property.waterBodyType
        ? humanizeEnum(property.waterBodyType)
        : null;

  const rows: Array<[string, string]> = [];
  if (waterBodyName) rows.push([t('labelWaterBody'), waterBodyName]);
  if (property.waterAccessType?.length) {
    rows.push([t('labelAccess'), property.waterAccessType.map(humanizeEnum).join(' · ')]);
  }
  if (property.waterFrontageM != null) {
    rows.push([t('labelFrontage'), formatLength(property.waterFrontageM, units, locale)]);
  }
  if (property.distanceToWaterM != null) {
    rows.push([t('labelDistanceToWater'), formatLength(property.distanceToWaterM, units, locale)]);
  }
  if (property.beachType && property.beachType !== 'none') {
    rows.push([t('labelBeach'), humanizeEnum(property.beachType)]);
  }
  if (property.orientation) rows.push([t('labelOrientation'), property.orientation]);
  if (property.swimmableFromProperty != null) {
    rows.push([t('labelSwimmable'), property.swimmableFromProperty ? t('yes') : t('no')]);
  }
  if (property.shorelineTenure) {
    rows.push([t('labelShorelineTenure'), humanizeEnum(property.shorelineTenure)]);
  }
  if (property.waterfrontProtection) {
    rows.push([t('labelShorelineProtection'), humanizeEnum(property.waterfrontProtection)]);
  }

  if (rows.length === 0) return null;

  return (
    <section className="border-t border-ink">
      <h2 className="mb-3 mt-4 font-display text-lg text-ink">{t('waterCredentialsTitle')}</h2>
      {rows.map(([label, value], index) => (
        <Row key={label} label={label} value={value} last={index === rows.length - 1} />
      ))}
    </section>
  );
}
