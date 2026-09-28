import { getLocale, getTranslations } from 'next-intl/server';

import { humanizeEnum } from '@/components/property/WaterChips';
import { formatLength } from '@/lib/intl/format';
import { getViewerPreferences } from '@/lib/intl/preferences';
import type { Property } from '@/payload-types';

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 py-2 text-xs ${last ? '' : 'border-b border-vellum/15'}`}
    >
      <span className="tracking-[0.04em] text-vellum/55">{label}</span>
      <b className="font-medium tabular-nums text-vellum [overflow-wrap:anywhere] sm:text-right">
        {value}
      </b>
    </div>
  );
}

/**
 * The Berth & navigation panel (§10.3) — abyss background, sand badge,
 * rendered only when nautical fields are populated. The second signature
 * block of the whole product.
 */
export async function NauticalPanel({ property }: { property: Property }) {
  const t = await getTranslations('listing');
  const locale = await getLocale();
  const { units } = await getViewerPreferences();

  const rows: Array<[string, string]> = [];
  if (property.mooringType && property.mooringType !== 'none') {
    const berths =
      property.berthCount != null ? ` · ${property.berthCount} ${t('labelBerths').toLowerCase()}` : '';
    rows.push([t('labelMooring'), `${humanizeEnum(property.mooringType)}${berths}`]);
  }
  if (property.maxBoatLoaM != null) {
    rows.push([t('labelMaxBoatLength'), formatLength(property.maxBoatLoaM, units, locale)]);
  }
  if (property.maxBoatBeamM != null) {
    rows.push([t('labelMaxBeam'), formatLength(property.maxBoatBeamM, units, locale)]);
  }
  if (property.waterDepthAtBerthM != null) {
    rows.push([t('labelDepthAtBerth'), formatLength(property.waterDepthAtBerthM, units, locale)]);
  }
  if (property.navigableToOpenSea != null) {
    const bridges =
      property.fixedBridgesToOpenSea === false ? ` · ${t('badgeNoFixedBridges')}` : '';
    rows.push([
      t('labelNavigableToOpenSea'),
      `${property.navigableToOpenSea ? t('yes') : t('no')}${bridges}`,
    ]);
  }
  if (property.nearestMarinaName) {
    const distance =
      property.nearestMarinaDistanceKm != null
        ? ` · ${Math.round(property.nearestMarinaDistanceKm * 10) / 10} km`
        : '';
    rows.push([t('labelNearestMarina'), `${property.nearestMarinaName}${distance}`]);
  }

  if (rows.length === 0) return null;

  return (
    <section className="mt-5 bg-obsidian p-4 text-vellum sm:p-5">
      {property.maxBoatLoaM != null ? (
        <span className="mb-3 inline-block bg-patina-soft px-3 py-1.5 text-[length:var(--text-xs)] uppercase tracking-[0.12em] text-obsidian">
          {t('badgeFitsYacht', { n: property.maxBoatLoaM })}
        </span>
      ) : null}
      <h2 className="mb-3 font-display text-base text-vellum">{t('nauticalTitle')}</h2>
      {rows.map(([label, value], index) => (
        <Row key={label} label={label} value={value} last={index === rows.length - 1} />
      ))}
    </section>
  );
}
