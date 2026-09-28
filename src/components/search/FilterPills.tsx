import { getTranslations } from 'next-intl/server';

import { humanizeEnum } from '@/lib/humanize';
import { Link } from '@/i18n/navigation';
import {
  activeFilterParams,
  queryWithout,
  type SearchParams,
} from '@/lib/db/parse-search-params';

interface Pill {
  label: string;
  /** Params removed when the pill is dismissed. */
  removes: string[];
  key?: boolean;
}

function firstValue(params: SearchParams, name: string): string {
  const value = params[name];
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

async function buildPills(params: SearchParams): Promise<Pill[]> {
  const t = await getTranslations('search');
  const active = activeFilterParams(params);
  const pills: Pill[] = [];
  const seen = new Set<string>();

  for (const param of active) {
    if (seen.has(param)) continue;
    const value = firstValue(params, param);
    switch (param) {
      case 'water':
      case 'access':
      case 'type':
      case 'tier':
      case 'features':
      case 'tenure':
        pills.push({
          label: value.split(',').map(humanizeEnum).join(' · '),
          removes: [param],
        });
        break;
      case 'waterfront':
        if (!seen.has(param)) {
          pills.push({ label: t('fieldWater'), removes: [param] });
          seen.add(param);
        }
        break;
      case 'minFrontage':
        pills.push({ label: t('filterMinFrontage', { m: value }), removes: [param], key: true });
        break;
      case 'beds':
        pills.push({ label: t('filterBedsMin', { n: value }), removes: [param] });
        break;
      case 'price': {
        const [min, max] = value.split('-');
        const label = [min && `€${Number(min).toLocaleString()}`, max && `€${Number(max).toLocaleString()}`]
          .filter(Boolean)
          .join(' – ');
        pills.push({ label: label || value, removes: [param] });
        break;
      }
      case 'bbox':
        // Map-drawn area: shown implicitly by the map itself, no pill.
        break;
      default:
        pills.push({ label: `${humanizeEnum(param)}: ${value}`, removes: [param] });
    }
    seen.add(param);
  }
  return pills;
}

/**
 * Active-filter pill row per the design preview (.filters). Each pill is a
 * real link removing its filter; "clear all" resets to the bare search.
 */
export async function FilterPills({ params }: { params: SearchParams }) {
  const t = await getTranslations('search');
  const pills = await buildPills(params);
  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-vellum px-5 py-3">
      {pills.map((pill) => (
        <Link
          key={pill.label}
          href={`/search${queryWithout(params, pill.removes)}`}
          aria-label={t('removeFilterLabel', { filter: pill.label })}
          className={
            pill.key
              ? 'border border-patina px-3 py-1.5 text-xs text-patina hover:bg-bone'
              : 'border border-line px-3 py-1.5 text-xs text-graphite hover:bg-bone'
          }
        >
          {pill.label} <span aria-hidden="true">×</span>
        </Link>
      ))}
      <Link
        href="/search"
        className="ml-auto py-1.5 text-xs text-patina underline-offset-2 hover:underline"
      >
        {t('clearFilters')}
      </Link>
    </div>
  );
}
