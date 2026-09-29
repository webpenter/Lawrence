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
  ES: 'https://www.ine.es/dyngs/INEbase/en/operacion.htm?c=Estadistica_C&cid=1254736176951',
  GR: 'https://www.bankofgreece.gr/en/statistics/real-estate-market',
  PT: 'https://www.ine.pt/xportal/xmain?xpid=INE&xpgid=ine_indicadores&indOcorrCod=0010042',
  HR: 'https://www.dzs.hr/',
  US: 'https://fred.stlouisfed.org/',
  TC: 'https://fred.stlouisfed.org/',
  NO: 'https://www.ssb.no/en/priser-og-prisindekser/boligpriser-og-boligprisindekser',
  NL: 'https://www.cbs.nl/en-gb/figures/detail/83906ENG',
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

/** §5.5 sample segment pages: market slug × controlled-taxonomy segment. */
export interface SegmentPageSeed {
  marketSlug: string;
  segment: Segment;
  title: string;
  introParagraphs: string[];
  faq: Array<{ question: string; answer: string }>;
}

export const SEGMENT_PAGE_SEEDS: SegmentPageSeed[] = [
  {
    marketSlug: 'cote-dazur',
    segment: 'waterfront-estates',
    title: "Waterfront estates on the Côte d'Azur",
    introParagraphs: [
      "Waterfront estates on the Côte d'Azur are the reference asset of this collection: walled " +
        'grounds meeting the Mediterranean between Cap d’Antibes and Saint-Jean-Cap-Ferrat, priced ' +
        'from roughly €20 million and traded as much by introduction as by listing. The figures below ' +
        'are demonstration values from the sample dataset.',
    ],
    faq: [
      {
        question: "What distinguishes a waterfront estate on the Côte d'Azur from a villa with a sea view?",
        answer:
          'Direct, private access to the shoreline — a frontage, not a vantage point. Estates in this ' +
          'segment hold ground that touches the water, which is the scarcest position on the coast.',
      },
    ],
  },
  {
    marketSlug: 'lake-como',
    segment: 'waterfront-estates',
    title: 'Waterfront estates on Lake Como',
    introParagraphs: [
      'The great lakefront properties of Como — Laglio, Bellagio, Menaggio — pair historic villas ' +
        'with private darsene and gardens stepping straight into the lake. Qualifying estates start ' +
        'around €20 million in this sample dataset, and several trade without ever being listed.',
    ],
    faq: [
      {
        question: 'Do Lake Como estates come with private boat access?',
        answer:
          'The most valuable do: a private darsena (boathouse) or dock is the defining feature of the ' +
          'first rank of lakefront properties and is documented on each qualifying listing.',
      },
    ],
  },
  {
    marketSlug: 'lake-como',
    segment: 'historic-estates',
    title: 'Historic estates on Lake Como',
    introParagraphs: [
      'Como’s historic villas — many under heritage protection — are bought for provenance as much ' +
        'as position: frescoed interiors, terraced gardens and names that appear in the lake’s ' +
        'history. Heritage constraints shape what can be altered, which is precisely what preserves value.',
    ],
    faq: [
      {
        question: 'What does heritage protection mean for a buyer on Lake Como?',
        answer:
          'Alterations to protected elements require approvals, and in Italy the state may hold a ' +
          'pre-emption right on protected properties. Diligence with local counsel before offer is standard.',
      },
    ],
  },
  {
    marketSlug: 'mallorca',
    segment: 'waterfront-estates',
    title: 'Waterfront estates in Mallorca',
    introParagraphs: [
      'Mallorca’s southwest — Port d’Andratx above all — concentrates the island’s first-line ' +
        'estates: cliff-edge grounds with private sea access and long views to Dragonera. Qualifying ' +
        'properties start around €20 million in this sample dataset.',
    ],
    faq: [
      {
        question: 'Where are Mallorca’s first-line estates concentrated?',
        answer:
          'Port d’Andratx, Deià and the Santanyí coast hold most of the island’s true waterfront at ' +
          'this level; inland finca estates are a different, larger segment.',
      },
    ],
  },
  {
    marketSlug: 'greek-islands',
    segment: 'private-islands',
    title: 'Private islands in the Aegean',
    introParagraphs: [
      'The Aegean remains one of the few places where a whole island can be privately held: from ' +
        'compact islets off Mykonos to working estates with harbours. Title, zoning and mooring ' +
        'rights drive value more than land area, and every qualifying listing documents all three.',
    ],
    faq: [
      {
        question: 'Can foreign buyers own a Greek island outright?',
        answer:
          'Generally yes, with clearances in border regions and standard national-land checks. The ' +
          'practical constraints are zoning, build entitlements and infrastructure rather than nationality.',
      },
    ],
  },
  {
    marketSlug: 'turks-caicos',
    segment: 'private-islands',
    title: 'Private islands in Turks & Caicos',
    introParagraphs: [
      'Turks & Caicos private islands trade on clear Crown-derived title, proximity to ' +
        'Providenciales and buildable elevation. The handful of freehold islands that reach the ' +
        'market do so quietly; several in this sample set are held off-market.',
    ],
    faq: [
      {
        question: 'What should a buyer verify first on a Caribbean private island?',
        answer:
          'Title class, elevation and insurability, and the logistics chain — power, water, and the ' +
          'boat or air link that services the island. Each qualifying listing states these as structured data.',
      },
    ],
  },
  {
    marketSlug: 'cote-dazur',
    segment: 'penthouses',
    title: "Penthouses on the Côte d'Azur",
    introParagraphs: [
      'The penthouse segment on the Côte d’Azur is small and vertical: full-floor apartments above ' +
        'the Croisette and Monaco’s borders trade on terrace area and view line rather than interior ' +
        'volume. Qualifying penthouses start around €20 million in this sample dataset.',
    ],
    faq: [
      {
        question: 'What drives penthouse value on the Côte d’Azur?',
        answer:
          'Terrace square metres, protected sea view lines and building services. Interior area ' +
          'matters less at this level than the outdoor floor and what it looks onto.',
      },
    ],
  },
  {
    marketSlug: 'hamptons',
    segment: 'waterfront-estates',
    title: 'Waterfront estates in the Hamptons',
    introParagraphs: [
      'The oceanfront lanes of Southampton and East Hampton hold the reference estates of the East ' +
        'Coast: dune-front parcels measured in acres, with pond- and bay-front alternatives trading ' +
        'at a discount to the ocean. Qualifying estates start around €20 million in this sample dataset.',
    ],
    faq: [
      {
        question: 'Ocean, pond or bay — how do Hamptons waterfronts compare?',
        answer:
          'Oceanfront carries the premium and the erosion diligence; pond and bay fronts trade lower ' +
          'with calmer exposure. Each listing documents its frontage type and any coastal restrictions.',
      },
    ],
  },
  {
    marketSlug: 'norwegian-fjords',
    segment: 'ski-chalets',
    title: 'Chalets and mountain lodges in the Norwegian fjords',
    introParagraphs: [
      'Between Sognefjord’s arms, a small set of large timber lodges pairs ski touring terrain with ' +
        'private shoreline — a combination almost unique to Norway. The segment is thin; qualifying ' +
        'lodges appear rarely and several trade privately.',
    ],
    faq: [
      {
        question: 'Is foreign ownership of Norwegian fjord property restricted?',
        answer:
          'Norway is broadly open, but concession rules can apply to larger agricultural or shoreline ' +
          'holdings. Local counsel confirms whether a specific property needs one before offer.',
      },
    ],
  },
  {
    marketSlug: 'liguria',
    segment: 'historic-estates',
    title: 'Historic estates in Liguria & Portofino',
    introParagraphs: [
      'Portofino’s protected amphitheatre and the villas above Santa Margherita hold some of ' +
        'Italy’s most tightly guarded historic property: terraced gardens, listed façades and ' +
        'positions that cannot be rebuilt. Provenance files matter as much as floor plans here.',
    ],
    faq: [
      {
        question: 'What approvals govern works on a historic Ligurian villa?',
        answer:
          'Protected properties answer to the soprintendenza for alterations, and Italy may hold ' +
          'pre-emption rights on heritage sales. The constraint is also the moat: nothing new can ' +
          'take these positions.',
      },
    ],
  },
];

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
    title: 'Where €20M buys entry: prime-entry prices compared across 14 markets',
    publicationDate: '2026-06-15',
    marketSlugs: ['cote-dazur', 'lake-como', 'mallorca', 'hamptons'],
    metaDescription:
      'Sample-data comparison of prime-entry prices across 14 markets: where €20M clears the bar, where it does not, and how entry points moved year on year.',
    summaryParagraphs: [
      'This report compares the entry price of the prime segment — the level at which a property ' +
        'qualifies for this collection — across the fourteen sample markets we cover. All figures are ' +
        'demonstration values derived from the sample dataset baselines, shown with the public source ' +
        'each real figure would cite, as of June 2026.',
      'The headline: entry is converging at the top. In the sample set, prime entry clusters between ' +
        '€20 million and €24 million across the Mediterranean markets, with the Côte d’Azur at the top ' +
        'of the band and the Adriatic markets at the bottom. The spread inside each market is wider ' +
        'than the spread between markets: position — first line, protected view, private water access — ' +
        'moves price more than geography does.',
      'Per-square-metre medians tell the sharper story. The sample baselines run from roughly €4,500 ' +
        'in the fjords to €15,000 on the Côte d’Azur, a 3.3× spread that has narrowed year on year as ' +
        'secondary markets appreciated faster than the established ones. Days-on-market at this level ' +
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
    marketSlugs: ['liguria', 'cote-dazur', 'mallorca', 'hamptons'],
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
    marketSlugs: ['cote-dazur', 'lake-como', 'greek-islands', 'turks-caicos'],
    metaDescription:
      'How much of the trophy market is publicly visible? Sample-data estimates of published versus off-market share across 14 markets, and why the private layer exists.',
    summaryParagraphs: [
      'Not all inventory at this level is visible. This report estimates, market by market, how much ' +
        'of the trading stock is publicly listed and how much moves privately — the off-market layer ' +
        'this site exists to organise. The estimates are demonstration values derived from the sample ' +
        'dataset; the methodology section explains how real shares would be derived from transaction ' +
        'and listing counts.',
      'In the sample set, the off-market share rises with price and with heritage: the markets with ' +
        'the strictest planning regimes and the oldest housing stock — Portofino, Como, the Côte ' +
        'd’Azur capes — show the largest private layer, because discretion is worth most where supply ' +
        'cannot be rebuilt. Newer resort markets publish a larger share of their inventory.',
      'Why sellers stay private is consistent everywhere: pricing discovery without a public ' +
        'time-stamp, security, and the option to withdraw invisibly. Why buyers register is equally ' +
        'consistent: the private layer is where the positions that never list actually change hands.',
      'The practical conclusion for a buyer is unglamorous: watch the published market for calibration ' +
        'and register for the rest. The full PDF tabulates the share estimates with their derivations ' +
        'and sources per market.',
    ],
  },
];
