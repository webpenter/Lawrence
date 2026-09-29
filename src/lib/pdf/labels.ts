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
  keyFactsTitle: string;
  provenanceTitle: string;
  priceOnRequest: string;
  priceGuideBand: string;
  disclaimer: string;
  factBedrooms: string;
  factBathrooms: string;
  factReceptions: string;
  factBuiltArea: string;
  factPlotArea: string;
  factTerrace: string;
  factYearBuilt: string;
  factRenovated: string;
  factCondition: string;
  factTenure: string;
  factHeritage: string;
  factArchitect: string;
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
    keyFactsTitle: l('keyFactsTitle'),
    provenanceTitle: l('provenanceTitle'),
    priceOnRequest: pick(locale, 'common', 'priceOnRequest'),
    priceGuideBand: pick(locale, 'common', 'priceGuideBand'),
    disclaimer: l('disclaimer'),
    factBedrooms: l('factBedrooms'),
    factBathrooms: l('factBathrooms'),
    factReceptions: l('factReceptions'),
    factBuiltArea: l('factBuiltArea'),
    factPlotArea: l('factPlotArea'),
    factTerrace: l('factTerrace'),
    factYearBuilt: l('factYearBuilt'),
    factRenovated: l('factRenovated'),
    factCondition: l('factCondition'),
    factTenure: l('factTenure'),
    factHeritage: l('factHeritage'),
    factArchitect: l('factArchitect'),
    factReference: l('factReference'),
    yes: l('yes'),
    no: l('no'),
    sampleBadge: l('sampleBadge'),
  };
}
