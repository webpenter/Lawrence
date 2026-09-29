/**
 * §13.2.1 image query sets — a typed map so queries can be tuned without
 * touching the generator. Keys under byDestination match the sample
 * destination slugs in src/lib/sample/markets.ts.
 */
export const imageQueries = {
  byDestination: {
    'saint-tropez': ['saint tropez villa', 'french riviera estate', 'provence luxury villa pool'],
    'cap-ferrat': ['cap ferrat villa', 'french riviera mansion sea', 'belle epoque villa garden'],
    monaco: ['monaco penthouse view', 'monte carlo apartment terrace', 'monaco skyline harbour'],
    'lake-como': ['lake como villa', 'como lakefront terrace', 'italian villa garden lake'],
    'porto-cervo': ['sardinia luxury villa', 'costa smeralda house', 'mediterranean villa sea'],
    tuscany: ['tuscany estate vineyard', 'tuscan farmhouse hills', 'italian countryside villa'],
    marbella: ['marbella villa pool', 'andalusia luxury villa', 'spanish modern villa garden'],
    ibiza: ['ibiza villa sea view', 'balearic white villa', 'ibiza finca sunset'],
    mykonos: ['mykonos villa sea', 'cyclades white house', 'aegean luxury villa pool'],
    london: ['london townhouse facade', 'mayfair interior luxury', 'georgian townhouse london'],
    gstaad: ['swiss chalet snow', 'alpine chalet interior', 'gstaad mountain chalet'],
    courchevel: ['courchevel chalet', 'french alps luxury chalet', 'ski chalet fireplace'],
    aspen: ['aspen mountain house', 'colorado modern ranch', 'rocky mountain lodge'],
    'palm-beach': ['palm beach mansion', 'florida oceanfront estate', 'mediterranean revival florida'],
    hamptons: ['hamptons beach house', 'long island estate', 'shingle style house dunes'],
    dubai: ['dubai villa palm', 'dubai penthouse skyline', 'modern villa desert luxury'],
    'lake-geneva': ['lake geneva mansion', 'swiss lakefront estate', 'chateau lake garden'],
    algarve: ['algarve cliff villa', 'portugal coast house', 'atlantic villa pool'],
  },
  byFeature: {
    private_dock: ['private dock boat house', 'wooden jetty lake', 'yacht berth private'],
    private_beach: ['private beach villa', 'white sand beach house'],
    private_island: ['private island aerial', 'small mediterranean island'],
    interior: ['luxury living room view', 'classic kitchen marble', 'master suite luxury'],
    pool: ['infinity pool view', 'pool terrace sunset'],
    aerial: ['aerial estate grounds', 'drone shot luxury property'],
    detail: ['stone facade detail', 'classical architecture detail', 'terrace table view'],
  },
} as const;

export type DestinationQueryKey = keyof typeof imageQueries.byDestination;
export type FeatureQueryKey = keyof typeof imageQueries.byFeature;
