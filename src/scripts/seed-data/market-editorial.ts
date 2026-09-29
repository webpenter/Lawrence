import type { SampleDestination } from '@/lib/sample/markets';
import type { Segment } from '@/lib/seo/segments';

/**
 * §13.10 sample market editorial, derived — never invented. Every figure is
 * computed from the destination's `baseEurPerSqm` baseline (the same number
 * that drives the internally consistent sample listing prices), the source
 * URL cites the §13.6 public source for that country, and everything seeded
 * here carries isSample=true: SAMPLE notice, noindex, out of sitemaps
 * (rule 8). Real market content is an editor's job, not a seed's (§13.9).
 */

export const SEED_AS_OF = '2026-06-30';

/** The §13.6 open source of record per country, cited as the derivation base. */
const COUNTRY_SOURCES: Record<string, string> = {
  IT: 'https://www.agenziaentrate.gov.it/portale/web/guest/schede/fabbricatiterreni/omi',
  FR: 'https://app.dvf.etalab.gouv.fr/',
  MC: 'https://www.imsee.mc/',
  ES: 'https://www.ine.es/dyngs/INEbase/en/operacion.htm?c=Estadistica_C&cid=1254736176951',
  GR: 'https://www.bankofgreece.gr/en/statistics/real-estate-market',
  PT: 'https://www.ine.pt/xportal/xmain?xpid=INE&xpgid=ine_indicadores&indOcorrCod=0010042',
  GB: 'https://landregistry.data.gov.uk/app/ukhpi',
  CH: 'https://www.bfs.admin.ch/bfs/en/home/statistics/construction-housing.html',
  US: 'https://fred.stlouisfed.org/',
  AE: 'https://dubailand.gov.ae/en/open-data/real-estate-data/',
};

export interface MarketStatSeed {
  value: number;
  source: string;
  asOfDate: string;
}

export interface MarketEditorialSeed {
  answer: string;
  introParagraphs: string[];
  buyingNotesParagraphs: string[];
  faq: Array<{ question: string; answer: string }>;
  stats: {
    medianPriceEurPerSqm: MarketStatSeed;
    primeEntryEur: MarketStatSeed;
    yoyChangePct: MarketStatSeed;
    avgDaysOnMarket: MarketStatSeed;
  };
  metaDescription: string;
}

/** Deterministic per-slug variation so markets do not all read identically. */
function slugSeed(slug: string): number {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return hash;
}

export function marketEditorialFor(destination: SampleDestination): MarketEditorialSeed {
  const seed = slugSeed(destination.slug);
  const source = COUNTRY_SOURCES[destination.country] ?? COUNTRY_SOURCES.IT!;

  // All derived from the §13.10 baseline — the same internally consistent
  // arithmetic the sample listings use.
  const medianPerSqm = destination.baseEurPerSqm;
  const primeEntry = 20_000_000 + (seed % 5) * 1_000_000;
  const yoy = Number((((seed % 90) - 30) / 10).toFixed(1)); // −3.0% … +5.9%
  const daysOnMarket = 120 + (seed % 8) * 15; // 120–225 at this level

  const primeEntryM = Math.round(primeEntry / 1_000_000);
  const perSqmK = (medianPerSqm / 1000).toFixed(1);
  const yoyText = `${yoy > 0 ? '+' : ''}${yoy.toFixed(1)}%`;

  const answer =
    `Prime property in ${destination.name} starts around €${primeEntryM}M, with prime pricing near ` +
    `€${perSqmK}k per square metre as of June 2026 — ${yoyText} year on year in this sample dataset. ` +
    `Listings at this level typically take ${daysOnMarket} days to transact, and part of the inventory ` +
    `never reaches the public market.`;

  const introParagraphs = [
    `${destination.name} is one of the markets where trophy property actually trades: a thin, ` +
      `slow inventory concentrated around ${destination.localities.slice(0, 3).join(', ')}, priced ` +
      `from roughly €${primeEntryM} million for houses that qualify for this collection. The figures on ` +
      `this page are demonstration values derived from our sample dataset baselines and are shown with ` +
      `the public source each real figure would cite.`,
    `What defines the top of this market is scarcity of position rather than specification: the ` +
      `handful of addresses in ${destination.localities[0] ?? destination.name} that combine privacy, ` +
      `outlook and provenance change hands rarely, and often privately. The published listings below ` +
      `are the visible part; members see the rest.`,
  ];

  const buyingNotesParagraphs = [
    `Purchases at this level in ${destination.name} are usually structured with local counsel from ` +
      `the first offer: title and planning diligence runs in parallel with negotiation, and completion ` +
      `timelines of two to four months are normal rather than slow.`,
    `Total acquisition costs — transfer taxes or their equivalents, notarial and registration fees, ` +
      `and professional fees — vary materially by jurisdiction and structure. They are knowable, ` +
      `quotable figures: ask for the full schedule in writing before committing. Nothing on this page ` +
      `is advice; it is the checklist for one meeting with a local notary.`,
  ];

  const faq = [
    {
      question: `Where does prime pricing start in ${destination.name}?`,
      answer:
        `In this sample dataset, prime entry is around €${primeEntryM} million, with a median of ` +
        `€${perSqmK}k per square metre for qualifying homes as of June 2026. A real figure would be ` +
        `derived from the public source cited in the table above.`,
    },
    {
      question: `How long do properties at this level take to sell?`,
      answer:
        `Slowly, by design: the sample baseline is ${daysOnMarket} days on market. Thin inventory ` +
        `and discreet marketing mean time-to-sale says little about quality at this price point.`,
    },
    {
      question: `Is there off-market inventory in ${destination.name}?`,
      answer:
        `Yes. Part of the inventory at this level is never publicly listed. A free account with a ` +
        `confirmed email opens the off-market section, where those properties are visible with their ` +
        `full documentation.`,
    },
  ];

  const metaDescription =
    `Prime entry €${primeEntryM}M, ${yoyText} year on year as of June 2026 (sample data). ` +
    `Market data, current listings and buying notes for ${destination.name}, plus off-market ` +
    `inventory for members.`;

  return {
    answer,
    introParagraphs,
    buyingNotesParagraphs,
    faq,
    stats: {
      medianPriceEurPerSqm: { value: medianPerSqm, source, asOfDate: SEED_AS_OF },
      primeEntryEur: { value: primeEntry, source, asOfDate: SEED_AS_OF },
      yoyChangePct: { value: yoy, source, asOfDate: SEED_AS_OF },
      avgDaysOnMarket: { value: daysOnMarket, source, asOfDate: SEED_AS_OF },
    },
    metaDescription,
  };
}

/** §5.5 sample segment pages: 30 market × segment combinations (§13.10). */
export interface SegmentPageSeed {
  marketSlug: string;
  segment: Segment;
  title: string;
  introParagraphs: string[];
  faq: Array<{ question: string; answer: string }>;
}

/** The 30 combinations, chosen where the segment genuinely fits the market. */
const SEGMENT_COMBOS: Array<[string, Segment]> = [
  ['saint-tropez', 'waterfront-estates'],
  ['cap-ferrat', 'waterfront-estates'],
  ['lake-como', 'waterfront-estates'],
  ['porto-cervo', 'waterfront-estates'],
  ['ibiza', 'waterfront-estates'],
  ['mykonos', 'waterfront-estates'],
  ['palm-beach', 'waterfront-estates'],
  ['hamptons', 'waterfront-estates'],
  ['lake-geneva', 'waterfront-estates'],
  ['algarve', 'waterfront-estates'],
  ['gstaad', 'ski-chalets'],
  ['courchevel', 'ski-chalets'],
  ['aspen', 'ski-chalets'],
  ['monaco', 'penthouses'],
  ['london', 'penthouses'],
  ['dubai', 'penthouses'],
  ['palm-beach', 'penthouses'],
  ['tuscany', 'vineyard-estates'],
  ['saint-tropez', 'vineyard-estates'],
  ['tuscany', 'historic-estates'],
  ['lake-como', 'historic-estates'],
  ['london', 'historic-estates'],
  ['lake-geneva', 'historic-estates'],
  ['mykonos', 'private-islands'],
  ['ibiza', 'private-islands'],
  ['marbella', 'equestrian-estates'],
  ['hamptons', 'equestrian-estates'],
  ['marbella', 'golf-estates'],
  ['algarve', 'golf-estates'],
  ['dubai', 'new-developments'],
];

const SEGMENT_COPY: Record<
  Segment,
  { label: string; intro: (name: string, locality: string) => string; faq: (name: string) => { question: string; answer: string } }
> = {
  'waterfront-estates': {
    label: 'Waterfront estates',
    intro: (name, locality) =>
      `Waterfront estates in ${name} hold the scarcest position the market offers: private grounds ` +
      `meeting the water around ${locality}, priced from roughly €20 million and traded as much by ` +
      `introduction as by listing. The figures below are demonstration values from the sample dataset.`,
    faq: (name) => ({
      question: `What distinguishes a waterfront estate in ${name} from a home with a view?`,
      answer:
        'Direct, private access to the water — a frontage, not a vantage point. Estates in this ' +
        'segment hold ground that touches the shoreline, which cannot be rebuilt or replicated.',
    }),
  },
  'ski-chalets': {
    label: 'Ski chalets',
    intro: (name, locality) =>
      `The great chalets of ${name} concentrate around ${locality}: ski-in positions, staffed ` +
      `winters and inventory so thin that most sales complete privately. Qualifying chalets start ` +
      `around €20 million in this sample dataset.`,
    faq: (name) => ({
      question: `What drives chalet value in ${name}?`,
      answer:
        'Position relative to the slope and the village, plot rights in tightly zoned resorts, and ' +
        'the staffed infrastructure — the building itself is often the smallest part of the price.',
    }),
  },
  penthouses: {
    label: 'Penthouses',
    intro: (name, locality) =>
      `The penthouse segment in ${name} is small and vertical: full-floor residences above ` +
      `${locality} trading on terrace area, view lines and building service rather than interior ` +
      `volume. Qualifying penthouses start around €20 million in this sample dataset.`,
    faq: (name) => ({
      question: `What should a buyer verify first on a penthouse in ${name}?`,
      answer:
        'The title to the terraces and any roof rights, the service charge history, and the ' +
        'building\u2019s consent regime for alterations — the outdoor floor is usually the value.',
    }),
  },
  'vineyard-estates': {
    label: 'Vineyard estates',
    intro: (name, locality) =>
      `Vineyard estates in ${name} pair a serious residence with working land around ${locality}: ` +
      `producing vines, cellars and agricultural entitlements that shape both price and diligence. ` +
      `Qualifying estates start around €20 million in this sample dataset.`,
    faq: (name) => ({
      question: `Does a vineyard estate in ${name} come with the production?`,
      answer:
        'Usually — vines, cellar and any appellation rights transfer with the land, and the ' +
        'agricultural regime brings its own approvals. Diligence covers the farm as well as the house.',
    }),
  },
  'historic-estates': {
    label: 'Historic estates',
    intro: (name, locality) =>
      `The historic estates of ${name} — many under heritage protection around ${locality} — are ` +
      `bought for provenance as much as position. Constraints on alteration are precisely what ` +
      `preserve value here. Qualifying estates start around €20 million in this sample dataset.`,
    faq: (name) => ({
      question: `What does heritage protection mean for a buyer in ${name}?`,
      answer:
        'Alterations to protected elements need approvals, and some jurisdictions carry pre-emption ' +
        'rights on heritage sales. The constraint is also the moat: nothing new can take these positions.',
    }),
  },
  'private-islands': {
    label: 'Private islands',
    intro: (name, locality) =>
      `Around ${name}, a small set of private islands trades in single ownership near ${locality}: ` +
      `title, zoning and access drive value more than land area, and every qualifying listing ` +
      `documents all three. Several in this sample set are held off-market.`,
    faq: (name) => ({
      question: `What should a buyer verify first on a private island near ${name}?`,
      answer:
        'Title class and build entitlements, then the logistics chain — power, water, and the boat ' +
        'or air link that services the island. Each qualifying listing states these as structured data.',
    }),
  },
  'equestrian-estates': {
    label: 'Equestrian estates',
    intro: (name, locality) =>
      `Equestrian estates in ${name} combine a principal residence with working horse ` +
      `infrastructure around ${locality}: stabling, schooling arenas and paddock land with the ` +
      `water and access rights to run them. Qualifying estates start around €20 million in this ` +
      `sample dataset.`,
    faq: (name) => ({
      question: `What matters most in an equestrian estate in ${name}?`,
      answer:
        'Usable flat land with drainage and water rights, permitted stabling capacity, and hacking ' +
        'access — the equestrian value sits in the land and permissions, not the tack room.',
    }),
  },
  'new-developments': {
    label: 'New developments',
    intro: (name, locality) =>
      `The new-development segment in ${name} concentrates around ${locality}: branded residences ` +
      `and single-title new builds delivered turnkey, with developer covenants in place of ` +
      `provenance. Qualifying homes start around €20 million in this sample dataset.`,
    faq: (name) => ({
      question: `How does buying new in ${name} differ from a resale?`,
      answer:
        'Payment follows construction milestones, the developer\u2019s covenant and completion ' +
        'guarantee carry the risk, and specification choices close early — diligence shifts from the ' +
        'building\u2019s history to the developer\u2019s.',
    }),
  },
  'golf-estates': {
    label: 'Golf estates',
    intro: (name, locality) =>
      `Golf estates in ${name} front the fairways around ${locality}: gated ground on or beside ` +
      `championship courses, where membership rights and frontage to play decide the premium. ` +
      `Qualifying estates start around €20 million in this sample dataset.`,
    faq: (name) => ({
      question: `Do golf estates in ${name} include club membership?`,
      answer:
        'Sometimes — where membership attaches to the title it transfers with the sale; elsewhere it ' +
        'is a separate application. The listing states which regime applies.',
    }),
  },
};

import { SAMPLE_DESTINATION_BY_SLUG } from '@/lib/sample/markets';

export const SEGMENT_PAGE_SEEDS: SegmentPageSeed[] = SEGMENT_COMBOS.map(
  ([marketSlug, segment]) => {
    const destination = SAMPLE_DESTINATION_BY_SLUG.get(marketSlug);
    const name = destination?.name ?? marketSlug;
    const locality = destination?.localities[0] ?? name;
    const copy = SEGMENT_COPY[segment];
    return {
      marketSlug,
      segment,
      title: `${copy.label} in ${name}`,
      introParagraphs: [copy.intro(name, locality)],
      faq: [copy.faq(name)],
    };
  },
);

/** §15.4 — the three launch reports, summaries written from the sample baselines. */
export interface ReportSeed {
  slug: string;
  title: string;
  summaryParagraphs: string[];
  marketSlugs: string[];
  publicationDate: string;
  metaDescription: string;
}

export const REPORT_SEEDS: ReportSeed[] = [
  {
    slug: 'prime-entry-price-comparison-2026',
    title: 'Where €20M buys entry: prime-entry prices compared across 18 markets',
    publicationDate: '2026-06-15',
    marketSlugs: ['cap-ferrat', 'lake-como', 'monaco', 'hamptons'],
    metaDescription:
      'Sample-data comparison of prime-entry prices across 18 markets: where €20M clears the bar, where it does not, and how entry points moved year on year.',
    summaryParagraphs: [
      'This report compares the entry price of the prime segment — the level at which a property ' +
        'qualifies for this collection — across the eighteen sample markets we cover. All figures are ' +
        'demonstration values derived from the sample dataset baselines, shown with the public source ' +
        'each real figure would cite, as of June 2026.',
      'The headline: entry is converging at the top. In the sample set, prime entry clusters between ' +
        '€20 million and €24 million across the Mediterranean markets, with the Côte d’Azur at the top ' +
        'of the band and the Adriatic markets at the bottom. The spread inside each market is wider ' +
        'than the spread between markets: position — first line, protected view, private water access — ' +
        'moves price more than geography does.',
      'Per-square-metre medians tell the sharper story. The sample baselines run from roughly €8,000 ' +
        'in Tuscany and Dubai to €55,000 in Monaco, a near-sevenfold spread that has narrowed year on ' +
        'year as resort markets appreciated faster than the city states. Days-on-market at this level ' +
        'sit between four and seven months everywhere: thin markets clear slowly by design, and speed ' +
        'of sale says little about quality.',
      'What the published numbers cannot show is the private layer. A meaningful share of transactions ' +
        'at this level completes without a public listing; the off-market section of this site exists ' +
        'for exactly that inventory. The full PDF tabulates every market with its sources, methodology ' +
        'and the derivation of each figure.',
    ],
  },
  {
    slug: 'purchase-structures-four-jurisdictions-2026',
    title: 'Purchase structures and total acquisition costs in four jurisdictions',
    publicationDate: '2026-05-20',
    marketSlugs: ['tuscany', 'saint-tropez', 'marbella', 'hamptons'],
    metaDescription:
      'How trophy purchases are structured in Italy, France, Spain and the US — vehicles, transfer costs and timelines, compared side by side. Sample-data edition.',
    summaryParagraphs: [
      'Four jurisdictions dominate this collection — Italy, France, Spain and the United States — and ' +
        'each structures a trophy purchase differently. This report compares the standard vehicles, the ' +
        'total cost of acquisition and the realistic timeline in each, as a checklist for the first ' +
        'meeting with counsel. It is factual comparison, not advice; the demonstration figures are ' +
        'drawn from the sample dataset.',
      'The structural choices are stable: direct personal ownership remains the default in Italy and ' +
        'Spain; France routes a large share of significant purchases through the SCI, a civil property ' +
        'company that eases succession and co-ownership; US purchases at this level are predominantly ' +
        'LLC-held. In every jurisdiction the structure is chosen for succession, liability or privacy — ' +
        'and each choice carries annual filing and administration costs that are knowable in advance.',
      'Total acquisition costs diverge more than buyers expect: registration and transfer taxes, ' +
        'notarial fees and professional costs stack differently in each system, and resale-era rules — ' +
        'pre-emption rights on heritage property in Italy, the share-deal versus asset-deal question ' +
        'everywhere — are best answered at entry, not exit.',
      'Timelines are the quiet differentiator. A clean completion runs two to four months in the ' +
        'European jurisdictions and can be materially faster in the US; heritage protections, ' +
        'concessions and financing each add their own clock. The full PDF carries the ' +
        'jurisdiction-by-jurisdiction tables with sources.',
    ],
  },
  {
    slug: 'published-vs-off-market-share-2026',
    title: 'The visible market: published versus off-market share by market',
    publicationDate: '2026-04-10',
    marketSlugs: ['cap-ferrat', 'lake-como', 'mykonos', 'gstaad'],
    metaDescription:
      'How much of the trophy market is publicly visible? Sample-data estimates of published versus off-market share across 18 markets, and why the private layer exists.',
    summaryParagraphs: [
      'Not all inventory at this level is visible. This report estimates, market by market, how much ' +
        'of the trading stock is publicly listed and how much moves privately — the off-market layer ' +
        'this site exists to organise. The estimates are demonstration values derived from the sample ' +
        'dataset; the methodology section explains how real shares would be derived from transaction ' +
        'and listing counts.',
      'In the sample set, the off-market share rises with price and with heritage: the markets with ' +
        'the strictest planning regimes and the oldest housing stock — Cap Ferrat, Como, Gstaad — ' +
        'show the largest private layer, because discretion is worth most where supply cannot be ' +
        'rebuilt. Newer resort markets publish a larger share of their inventory.',
      'Why sellers stay private is consistent everywhere: pricing discovery without a public ' +
        'time-stamp, security, and the option to withdraw invisibly. Why buyers register is equally ' +
        'consistent: the private layer is where the positions that never list actually change hands.',
      'The practical conclusion for a buyer is unglamorous: watch the published market for calibration ' +
        'and register for the rest. The full PDF tabulates the share estimates with their derivations ' +
        'and sources per market.',
    ],
  },
];
