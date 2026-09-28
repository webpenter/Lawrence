/**
 * §13.2.1 image query sets — a typed map so queries can be tuned without
 * touching the generator. Keys under byDestination match the sample
 * destination slugs in src/lib/sample/markets.ts.
 */
export const imageQueries = {
  byDestination: {
    liguria: ['portofino coast villa', 'italian riviera sea', 'ligurian coastline house'],
    'lake-como': ['lake como villa', 'como lakefront terrace', 'italian lake boathouse'],
    'amalfi-coast': ['amalfi coast villa', 'positano cliff house', 'mediterranean terrace sea'],
    'cote-dazur': ['french riviera villa', 'cap ferrat sea view', 'mediterranean modern villa'],
    mallorca: ['mallorca sea villa', 'balearic coast house', 'mediterranean cala boat'],
    ibiza: ['ibiza villa sea view', 'balearic white villa', 'ibiza coast sunset'],
    dalmatia: ['croatia coast villa', 'dalmatian island house', 'adriatic stone house sea'],
    'greek-islands': ['greek island villa', 'cyclades white house sea', 'aegean coast house'],
    algarve: ['algarve cliff villa', 'portugal coast house', 'atlantic villa pool'],
    'florida-keys': ['florida waterfront mansion', 'miami canal house dock', 'key west waterfront'],
    hamptons: ['hamptons beach house', 'long island waterfront home', 'shingle beach house dunes'],
    'turks-caicos': ['turks caicos beach villa', 'caribbean beachfront house', 'turquoise water villa'],
    'norwegian-fjords': ['norway fjord house', 'boathouse fjord', 'scandinavian waterfront cabin'],
    amsterdam: ['amsterdam canal house', 'dutch canal waterfront', 'canal house facade water'],
  },
  byFeature: {
    private_dock: ['private dock boat house', 'wooden jetty lake', 'yacht berth private'],
    private_beach: ['private beach villa', 'white sand beach house'],
    private_island: ['private island aerial', 'small tropical island'],
    interior: ['luxury living room sea view', 'modern kitchen ocean view', 'master bedroom sea'],
    pool: ['infinity pool ocean', 'pool terrace sunset sea'],
    aerial: ['aerial coastline villa', 'drone shot waterfront property'],
    detail: ['boat rope cleat dock', 'mediterranean architecture detail', 'terrace table sea view'],
  },
} as const;

export type DestinationQueryKey = keyof typeof imageQueries.byDestination;
export type FeatureQueryKey = keyof typeof imageQueries.byFeature;
