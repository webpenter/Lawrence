import de from '@/messages/de.json';
import en from '@/messages/en.json';
import es from '@/messages/es.json';
import fr from '@/messages/fr.json';
import it from '@/messages/it.json';
import ru from '@/messages/ru.json';

/**
 * Brochure label resolution straight from the message files with en fallback —
 * the PDF renders outside a next-intl request context (route handlers, admin
 * actions, tests), so it reads the same catalog directly.
 */

type Catalog = { listing: Record<string, string>; common: Record<string, string> };

const CATALOGS: Record<string, Catalog> = {
  en: en as unknown as Catalog,
  it: it as unknown as Catalog,
  fr: fr as unknown as Catalog,
  de: de as unknown as Catalog,
  es: es as unknown as Catalog,
  ru: ru as unknown as Catalog,
};

export interface BrochureLabels {
  waterCredentialsTitle: string;
  nauticalTitle: string;
  keyFactsTitle: string;
  priceOnRequest: string;
  disclaimer: string;
  labelWaterBody: string;
  labelAccess: string;
  labelFrontage: string;
  labelDistanceToWater: string;
  labelMooring: string;
  labelMaxBoatLength: string;
  labelDepthAtBerth: string;
  labelNavigableToOpenSea: string;
  factBedrooms: string;
  factBathrooms: string;
  factBuiltArea: string;
  factPlotArea: string;
  factYearBuilt: string;
  factReference: string;
  yes: string;
  no: string;
  sampleBadge: string;
}

function pick(locale: string, namespace: 'listing' | 'common', key: string): string {
  const localized = CATALOGS[locale]?.[namespace]?.[key];
  if (localized && localized.trim() !== '') return localized;
  return CATALOGS.en?.[namespace]?.[key] ?? key;
}

export function brochureLabels(locale: string): BrochureLabels {
  const l = (key: string) => pick(locale, 'listing', key);
  return {
    waterCredentialsTitle: l('waterCredentialsTitle'),
    nauticalTitle: l('nauticalTitle'),
    keyFactsTitle: l('keyFactsTitle'),
    priceOnRequest: pick(locale, 'common', 'priceOnRequest'),
    disclaimer: l('disclaimer'),
    labelWaterBody: l('labelWaterBody'),
    labelAccess: l('labelAccess'),
    labelFrontage: l('labelFrontage'),
    labelDistanceToWater: l('labelDistanceToWater'),
    labelMooring: l('labelMooring'),
    labelMaxBoatLength: l('labelMaxBoatLength'),
    labelDepthAtBerth: l('labelDepthAtBerth'),
    labelNavigableToOpenSea: l('labelNavigableToOpenSea'),
    factBedrooms: l('factBedrooms'),
    factBathrooms: l('factBathrooms'),
    factBuiltArea: l('factBuiltArea'),
    factPlotArea: l('factPlotArea'),
    factYearBuilt: l('factYearBuilt'),
    factReference: l('factReference'),
    yes: l('yes'),
    no: l('no'),
    sampleBadge: l('sampleBadge'),
  };
}
