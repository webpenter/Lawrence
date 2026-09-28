import { clsx } from 'clsx';
import { getLocale, getTranslations } from 'next-intl/server';

import { humanizeEnum } from '@/components/property/WaterChips';
import { AspectBox } from '@/components/ui/AspectBox';
import { Link } from '@/i18n/navigation';
import { formatArea, formatLength, formatPriceEur } from '@/lib/intl/format';
import { getViewerPreferences } from '@/lib/intl/preferences';
import type { SearchHit } from '@/lib/search/client';
import { layout } from '@/tokens/layout';
import { HORIZON_LINE, horizonGradientFor, PHOTO_SCRIM } from '@/tokens/placeholders';

/**
 * Search-result row per the design preview: 150px 3:2 image, locality label,
 * serif title, secondary meta, water chips leading with the key credential.
 * Renders a flat search document so Typesense and Postgres hits look identical.
 */
export async function SearchResultCard({ hit }: { hit: SearchHit }) {
  const t = await getTranslations('common');
  const locale = await getLocale();
  const { currency, units } = await getViewerPreferences();

  const price =
    typeof hit.priceEur === 'number'
      ? formatPriceEur(hit.priceEur, currency, locale)
      : t('priceOnRequest');

  const meta = [
    typeof hit.bedrooms === 'number' ? `${hit.bedrooms} bed` : null,
    typeof hit.bathrooms === 'number' ? `${hit.bathrooms} bath` : null,
    typeof hit.builtAreaSqm === 'number' ? formatArea(hit.builtAreaSqm, units, locale) : null,
  ].filter(Boolean) as string[];

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
    <Link
      href={`/property/${hit.slug}`}
      data-property-id={hit.id}
      className="group grid gap-4 border border-line bg-vellum p-3"
      style={{ gridTemplateColumns: `${layout.searchRowImageW} 1fr` }}
    >
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
      <div className="flex flex-col gap-1">
        {/* Preview .row label: "Portofino · Liguria" — locality · region,
            country code only as the last resort. */}
        {(() => {
          const locality = [hit.locality, hit.region]
            .filter((part): part is string => typeof part === 'string' && part.length > 0)
            .join(' · ');
          const label = locality || (typeof hit.country === 'string' ? hit.country : '');
          return label ? (
            <span className="text-[length:var(--text-xs)] uppercase tracking-[0.18em] text-graphite">
              {label}
            </span>
          ) : null;
        })()}
        <h3 className="font-display text-[length:var(--text-base)] text-ink group-hover:text-patina">
          {hit.title}
        </h3>
        <div className="flex flex-wrap gap-x-3 text-xs text-graphite">
          {meta.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        {chips.length > 0 ? (
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
        ) : null}
        <div className="mt-auto pt-1 text-sm tabular-nums text-ink">{price}</div>
      </div>
    </Link>
  );
}
