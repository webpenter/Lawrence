import { getLocale, getTranslations } from 'next-intl/server';

import { AspectBox } from '@/components/ui/AspectBox';
import { Link } from '@/i18n/navigation';
import { formatArea, formatPriceEur } from '@/lib/intl/format';
import { getViewerPreferences } from '@/lib/intl/preferences';
import type { Property } from '@/payload-types';

import { HorizonImage } from './HorizonImage';

interface PropertyCardProps {
  property: Property;
  /** 'card' = grid card (3:2 image on top); 'row' = search-result row. */
  variant?: 'card' | 'row';
  priority?: boolean;
}

/**
 * Design-preview card: price · location · frontage · water body · access.
 * Beds and baths are secondary — water data leads (§4 decision 4).
 */
export async function PropertyCard({
  property,
  variant = 'card',
  priority = false,
}: PropertyCardProps) {
  const t = await getTranslations('common');
  const locale = await getLocale();
  const { currency, units } = await getViewerPreferences();

  const price =
    property.priceType === 'fixed' && property.priceEur != null
      ? formatPriceEur(property.priceEur, currency, locale)
      : t('priceOnRequest');

  const locality = [property.location?.locality, property.location?.region]
    .filter(Boolean)
    .join(' · ');

  const meta = [
    locality,
    property.bedrooms != null ? `${property.bedrooms} bed` : null,
    property.builtAreaSqm != null ? formatArea(property.builtAreaSqm, units, locale) : null,
  ].filter(Boolean) as string[];

  const image = (
    <HorizonImage
      media={property.media?.[0] ?? null}
      seed={property.id}
      sizes={variant === 'card' ? '(max-width: 768px) 100vw, 33vw' : '150px'}
      priority={priority}
    />
  );

  const body = (
    <>
      <h3 className="font-display text-base text-ink group-hover:text-patina">
        {property.title}
      </h3>
      <div className="flex flex-wrap gap-x-3 text-xs text-graphite">
        {meta.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="mt-1 text-sm tabular-nums text-ink">{price}</div>
    </>
  );

  if (variant === 'row') {
    return (
      <Link
        href={`/property/${property.slug}`}
        className="group grid grid-cols-[150px_1fr] gap-4 border border-line bg-vellum p-3"
      >
        <AspectBox ratio="card">{image}</AspectBox>
        <div className="flex flex-col gap-1">{body}</div>
      </Link>
    );
  }

  return (
    <Link href={`/property/${property.slug}`} className="group flex flex-col gap-1">
      <AspectBox ratio="card" className="mb-2">
        {image}
      </AspectBox>
      {body}
    </Link>
  );
}
