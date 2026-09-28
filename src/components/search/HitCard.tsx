import { getLocale, getTranslations } from 'next-intl/server';

import { humanizeEnum } from '@/lib/humanize';
import { AspectBox } from '@/components/ui/AspectBox';
import { Link } from '@/i18n/navigation';
import { formatLength, formatPriceEur } from '@/lib/intl/format';
import { getViewerPreferences } from '@/lib/intl/preferences';
import type { SearchHit } from '@/lib/search/client';
import { HORIZON_LINE, PHOTO_SCRIM, horizonGradientFor } from '@/tokens/placeholders';

/**
 * Card-style search hit for landing pages, per the preview's §5 grid3
 * (`.card`: 3:2 image, serif title, chips row, tabular price) — the same
 * water-first hierarchy as the home cards, built from a flat SearchHit.
 */
export async function HitCard({ hit }: { hit: SearchHit }) {
  const t = await getTranslations('common');
  const locale = await getLocale();
  const { currency, units } = await getViewerPreferences();

  const chips: Array<{ label: string; key: boolean }> = [];
  if (typeof hit.waterFrontageM === 'number') {
    chips.push({ label: `${formatLength(hit.waterFrontageM, units, locale)} frontage`, key: true });
  } else if (typeof hit.maxBoatLoaM === 'number') {
    chips.push({ label: `Berth ${formatLength(hit.maxBoatLoaM, units, locale)}`, key: true });
  }
  if (typeof hit.waterBodyType === 'string') {
    chips.push({ label: humanizeEnum(hit.waterBodyType), key: false });
  }
  const access = Array.isArray(hit.waterAccessType) ? hit.waterAccessType[0] : undefined;
  if (typeof access === 'string') chips.push({ label: humanizeEnum(access), key: false });

  return (
    <Link href={`/property/${hit.slug}`} className="group block">
      <AspectBox ratio="card">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: horizonGradientFor(hit.id) }}
        >
          <div className="absolute inset-x-0 top-[46%] h-px" style={{ background: HORIZON_LINE }} />
        </div>
        <div aria-hidden="true" className="absolute inset-0" style={{ background: PHOTO_SCRIM }} />
      </AspectBox>
      <h3 className="mb-1 mt-3 font-display text-[length:var(--text-base)] text-ink group-hover:text-patina">
        {hit.title}
      </h3>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className={
              chip.key
                ? 'border border-patina px-1.5 py-0.5 text-[length:var(--text-xs)] uppercase tracking-[0.1em] text-patina'
                : 'border border-line-strong px-1.5 py-0.5 text-[length:var(--text-xs)] uppercase tracking-[0.1em] text-graphite'
            }
          >
            {chip.label}
          </span>
        ))}
      </div>
      <p className="text-sm tabular-nums text-ink">
        {typeof hit.priceEur === 'number'
          ? formatPriceEur(hit.priceEur, currency, locale)
          : t('priceOnRequest')}
      </p>
    </Link>
  );
}
