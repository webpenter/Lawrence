/**
 * The §13.10 sample destinations: 12 named markets plus the fjord and canal
 * outliers. Coordinates come from public geodata (GeoNames-style town/coast
 * centroids); each destination carries a shoreline bounding box so generated
 * listings sit on plausible water-adjacent land but — per §13.12 — never on an
 * identifiable private home (points are deterministic jitter inside the box,
 * not real addresses).
 */

export interface SampleDestination {
  slug: string;
  name: string;
  country: string;
  region?: string;
  waterBody: { slug: string; name: string; type: string };
  /** Shoreline-adjacent box [west, south, east, north] for coordinate jitter. */
  bbox: [number, number, number, number];
  currency: 'EUR' | 'USD' | 'GBP' | 'CHF';
  /** Baseline €/m² driving internally consistent pricing (§13.10). */
  baseEurPerSqm: number;
  propertyTypes: string[];
  waterBodyType: string;
  localities: string[];
}

export const SAMPLE_DESTINATIONS: SampleDestination[] = [
  {
    slug: 'liguria',
    name: 'Liguria & Portofino',
    country: 'IT',
    region: 'Liguria',
    waterBody: { slug: 'ligurian-sea', name: 'Ligurian Sea', type: 'sea' },
    bbox: [8.85, 44.25, 9.55, 44.42],
    currency: 'EUR',
    baseEurPerSqm: 12_000,
    propertyTypes: ['villa', 'apartment', 'estate'],
    waterBodyType: 'sea',
    localities: ['Portofino', 'Santa Margherita Ligure', 'Camogli', 'Sestri Levante'],
  },
  {
    slug: 'lake-como',
    name: 'Lake Como',
    country: 'IT',
    region: 'Lombardy',
    waterBody: { slug: 'lake-como', name: 'Lake Como', type: 'lake' },
    bbox: [9.05, 45.8, 9.4, 46.15],
    currency: 'EUR',
    baseEurPerSqm: 10_000,
    propertyTypes: ['villa', 'estate', 'apartment'],
    waterBodyType: 'lake',
    localities: ['Bellagio', 'Laglio', 'Menaggio', 'Varenna'],
  },
  {
    slug: 'amalfi-coast',
    name: 'Amalfi Coast',
    country: 'IT',
    region: 'Campania',
    waterBody: { slug: 'tyrrhenian-sea', name: 'Tyrrhenian Sea', type: 'sea' },
    bbox: [14.48, 40.6, 14.75, 40.68],
    currency: 'EUR',
    baseEurPerSqm: 11_000,
    propertyTypes: ['villa', 'apartment'],
    waterBodyType: 'sea',
    localities: ['Positano', 'Amalfi', 'Praiano', 'Ravello'],
  },
  {
    slug: 'cote-dazur',
    name: "Côte d'Azur",
    country: 'FR',
    region: "Provence-Alpes-Côte d'Azur",
    waterBody: { slug: 'mediterranean-sea', name: 'Mediterranean Sea', type: 'sea' },
    bbox: [6.95, 43.48, 7.45, 43.72],
    currency: 'EUR',
    baseEurPerSqm: 15_000,
    propertyTypes: ['villa', 'estate', 'penthouse'],
    waterBodyType: 'sea',
    localities: ['Cap d’Antibes', 'Saint-Jean-Cap-Ferrat', 'Cannes', 'Villefranche-sur-Mer'],
  },
  {
    slug: 'mallorca',
    name: 'Mallorca',
    country: 'ES',
    region: 'Balearic Islands',
    waterBody: { slug: 'balearic-sea', name: 'Balearic Sea', type: 'sea' },
    bbox: [2.35, 39.4, 3.45, 39.85],
    currency: 'EUR',
    baseEurPerSqm: 9_000,
    propertyTypes: ['villa', 'estate', 'farmhouse'],
    waterBodyType: 'sea',
    localities: ['Port d’Andratx', 'Deià', 'Pollença', 'Santanyí'],
  },
  {
    slug: 'ibiza',
    name: 'Ibiza',
    country: 'ES',
    region: 'Balearic Islands',
    waterBody: { slug: 'balearic-sea', name: 'Balearic Sea', type: 'sea' },
    bbox: [1.22, 38.87, 1.62, 39.1],
    currency: 'EUR',
    baseEurPerSqm: 10_500,
    propertyTypes: ['villa', 'estate'],
    waterBodyType: 'sea',
    localities: ['Es Cubells', 'Cala Jondal', 'Santa Eulalia', 'Portinatx'],
  },
  {
    slug: 'dalmatia',
    name: 'Dalmatia',
    country: 'HR',
    region: 'Dalmatia',
    waterBody: { slug: 'adriatic-sea', name: 'Adriatic Sea', type: 'sea' },
    bbox: [15.9, 43.3, 16.9, 43.75],
    currency: 'EUR',
    baseEurPerSqm: 6_000,
    propertyTypes: ['villa', 'townhouse', 'private_island'],
    waterBodyType: 'sea',
    localities: ['Hvar', 'Brač', 'Trogir', 'Šolta'],
  },
  {
    slug: 'greek-islands',
    name: 'Greek Islands',
    country: 'GR',
    region: 'South Aegean',
    waterBody: { slug: 'aegean-sea', name: 'Aegean Sea', type: 'sea' },
    bbox: [24.3, 36.35, 25.55, 37.5],
    currency: 'EUR',
    baseEurPerSqm: 7_000,
    propertyTypes: ['villa', 'private_island', 'estate'],
    waterBodyType: 'sea',
    localities: ['Mykonos', 'Paros', 'Santorini', 'Sifnos'],
  },
  {
    slug: 'algarve',
    name: 'Algarve',
    country: 'PT',
    region: 'Algarve',
    waterBody: { slug: 'atlantic-ocean', name: 'Atlantic Ocean', type: 'ocean' },
    bbox: [-8.95, 37.0, -7.85, 37.15],
    currency: 'EUR',
    baseEurPerSqm: 6_500,
    propertyTypes: ['villa', 'estate', 'apartment'],
    waterBodyType: 'ocean',
    localities: ['Lagos', 'Vale do Lobo', 'Carvoeiro', 'Tavira'],
  },
  {
    slug: 'florida-keys',
    name: 'Florida Keys & Miami',
    country: 'US',
    region: 'Florida',
    waterBody: { slug: 'intracoastal-waterway', name: 'Intracoastal Waterway', type: 'canal' },
    bbox: [-81.8, 24.55, -80.12, 25.9],
    currency: 'USD',
    baseEurPerSqm: 8_500,
    propertyTypes: ['villa', 'marina_residence', 'estate'],
    waterBodyType: 'canal',
    localities: ['Key Largo', 'Islamorada', 'Coral Gables', 'Fort Lauderdale'],
  },
  {
    slug: 'hamptons',
    name: 'The Hamptons',
    country: 'US',
    region: 'New York',
    waterBody: { slug: 'atlantic-ocean', name: 'Atlantic Ocean', type: 'ocean' },
    bbox: [-72.4, 40.85, -71.95, 41.05],
    currency: 'USD',
    baseEurPerSqm: 13_000,
    propertyTypes: ['estate', 'villa', 'farmhouse'],
    waterBodyType: 'ocean',
    localities: ['Southampton', 'East Hampton', 'Sag Harbor', 'Montauk'],
  },
  {
    slug: 'turks-caicos',
    name: 'Turks & Caicos',
    country: 'TC',
    region: 'Providenciales',
    waterBody: { slug: 'caribbean-sea', name: 'Caribbean Sea', type: 'sea' },
    bbox: [-72.35, 21.74, -72.1, 21.85],
    currency: 'USD',
    baseEurPerSqm: 9_500,
    propertyTypes: ['villa', 'private_island', 'estate'],
    waterBodyType: 'sea',
    localities: ['Grace Bay', 'Long Bay', 'Leeward', 'Chalk Sound'],
  },
  // The two §13.10 outliers keep fjord and canal filters populated.
  {
    slug: 'norwegian-fjords',
    name: 'Norwegian Fjords',
    country: 'NO',
    region: 'Vestland',
    waterBody: { slug: 'sognefjord', name: 'Sognefjord', type: 'fjord' },
    bbox: [6.0, 61.0, 7.3, 61.25],
    currency: 'EUR',
    baseEurPerSqm: 4_500,
    propertyTypes: ['chalet', 'boathouse', 'farmhouse'],
    waterBodyType: 'fjord',
    localities: ['Balestrand', 'Solvorn', 'Fjærland', 'Lavik'],
  },
  {
    slug: 'amsterdam',
    name: 'Amsterdam',
    country: 'NL',
    region: 'North Holland',
    waterBody: { slug: 'amsterdam-canals', name: 'Amsterdam Canal Ring', type: 'canal' },
    bbox: [4.86, 52.35, 4.94, 52.39],
    currency: 'EUR',
    baseEurPerSqm: 9_000,
    propertyTypes: ['townhouse', 'apartment', 'boathouse'],
    waterBodyType: 'canal',
    localities: ['Herengracht', 'Keizersgracht', 'Prinsengracht', 'Amstel'],
  },
];

export const SAMPLE_DESTINATION_BY_SLUG = new Map(
  SAMPLE_DESTINATIONS.map((destination) => [destination.slug, destination]),
);
