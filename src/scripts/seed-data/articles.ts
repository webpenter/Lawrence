import { ARTICLE_PARAGRAPHS, DEMO_ARTICLE } from '@/lib/sample/fallback-content';

/**
 * §13.10: eight sample journal articles from the §13.7 backlog — published
 * as demonstration content (isSample: SAMPLE notice, noindex, out of
 * sitemaps). Deliberately free of statistics and market claims (§13.9):
 * descriptive, general-knowledge editorial a reader can verify.
 */

export interface ArticleSeed {
  slug: string;
  title: string;
  excerpt: string;
  paragraphs: string[];
}

export const SAMPLE_ARTICLES: ArticleSeed[] = [
  {
    slug: DEMO_ARTICLE.slug,
    title: DEMO_ARTICLE.title,
    excerpt: DEMO_ARTICLE.excerpt,
    paragraphs: [...ARTICLE_PARAGRAPHS],
  },
  {
    slug: 'sample-heritage-protection-preemption',
    title: 'Heritage protection and pre-emption rights, explained',
    excerpt:
      'What a protected listing changes for a buyer: approvals, timelines, and the state’s occasional right to step into your purchase.',
    paragraphs: [
      'A heritage listing changes three things for a buyer: what may be altered, who must approve it, and — in several jurisdictions — whether the state can step into the sale itself. None of the three is a reason to walk away; each is a reason to sequence the purchase correctly.',
      'Alterations first. Protected elements — a façade, a fresco cycle, a staircase, sometimes the garden plan — need consent from the heritage authority before works begin. The practical consequence is that renovation plans should be tested with the authority before the offer is priced, not after completion.',
      'Pre-emption last. Where the law grants the state a right of first refusal on protected property, the sale contract completes conditionally and the authority has a fixed window to substitute itself as buyer at the agreed price. It is rarely exercised, always survivable, and only a problem for buyers who did not plan the timetable around it.',
    ],
  },
  {
    slug: 'sample-what-provenance-is-worth',
    title: 'What provenance is actually worth at the top of the market',
    excerpt:
      'Documented history is not sentiment — it is scarcity you can verify. How provenance changes diligence, insurance and resale.',
    paragraphs: [
      'At most price points a house is valued by measurement: area, position, condition. At the top of the market a fourth quantity appears — documented history — and it behaves less like decoration and more like title: it can be verified, it cannot be manufactured, and it survives every renovation cycle.',
      'Provenance is worth most where it is attached to something physical: the architect’s drawings, the estate archive, the planted avenue that appears in a century of photographs. In diligence it shortens arguments — a house with a documented past has usually resolved its boundary, access and alteration questions long ago.',
      'The resale logic is the simplest: positions can be copied by money, history cannot. A buyer choosing between two otherwise equal houses will pay the premium for the one whose story is written down, because that premium is recoverable at the next sale.',
    ],
  },
  {
    slug: 'sample-total-acquisition-costs',
    title: 'Total acquisition costs: the schedule to demand in writing',
    excerpt:
      'Transfer taxes, notarial fees, professional costs and the annual charges of a holding structure — knowable figures, best fixed before the offer.',
    paragraphs: [
      'Every jurisdiction stacks its acquisition costs differently — transfer taxes or their equivalents, notarial and registration fees, professional fees, and, where a structure holds the asset, that structure’s annual filings. What they share is that all of them are knowable in advance.',
      'The discipline is to demand the schedule in writing before the offer: one page, itemised, from the notary or counsel handling the purchase. At this level the total routinely shifts the real price by a mid-single-digit percentage, which is precisely the range in which negotiations are won and lost.',
      'The second page to demand covers exit: how the same jurisdiction taxes a future sale of the asset versus a sale of the entity holding it. The answer shapes whether a structure earns its running costs — and it is far cheaper to learn at entry than at exit.',
    ],
  },
  {
    slug: 'sample-why-trophy-sales-complete-slowly',
    title: 'Why trophy sales complete slowly — and why that is fine',
    excerpt:
      'Months-long timelines at the top of the market are not friction; they are the diligence the asset deserves, run in the right order.',
    paragraphs: [
      'Buyers arriving from liquid markets are often unsettled by the tempo at the top of the property market: months between agreement and completion, sometimes longer where heritage or agricultural regimes apply. The tempo is not inefficiency; it is the sum of checks that genuinely need to happen.',
      'Title at this level is rarely one clean parcel: it is assembled land, servitudes, concessions on the shoreline, entitlements on the vines. Each strand is verifiable, and each takes its own office and its own weeks. Running them in parallel — which good counsel does — is what compresses the timetable to months rather than seasons.',
      'The useful reframe is that speed is a property of commodity assets. The house that could complete in a week is usually the house that a thousand others could also buy. Scarce positions transact slowly for the same reason they hold value: nothing about them is interchangeable.',
    ],
  },
  {
    slug: 'sample-buying-a-private-island',
    title: 'Buying a private island: the eight questions to ask first',
    excerpt:
      'Title, zoning, water, power, access, staffing, insurance and exit — the island checklist, in the order that kills deals fastest.',
    paragraphs: [
      'Island purchases fail on questions that mainland buyers never think to ask. In the order that kills deals fastest: What exactly is titled — the land, the foreshore, the seabed under the jetty? What may be built or rebuilt under the zoning? Where does fresh water come from, and who guarantees it?',
      'Then the operational four: How does power arrive and what happens when it fails? What is the access chain — the boat, the mooring rights on the mainland side, the airstrip licence? Who staffs the island and where do they live? What will an insurer actually cover, at what elevation, after which survey?',
      'The eighth question is the exit: how many buyers exist for this island at this price, and through whom would it sell? An island that answers all eight in writing is a rare and durable asset. An island that answers five of them is a boat trip, not a purchase.',
    ],
  },
  {
    slug: 'sample-the-quiet-viewing',
    title: 'The quiet viewing: how off-market houses are actually shown',
    excerpt:
      'No listing, no brochure in circulation, no crowd: the choreography of discreet sales, and what a serious buyer is expected to bring.',
    paragraphs: [
      'A discreet sale replaces publicity with choreography. There is no listing to find; there is an introduction, a conversation about fit, and a viewing arranged around the owner’s absence. The house is not being marketed — it is being shown, singly, to people who have already been qualified.',
      'What the buyer is expected to bring is symmetry: identity established, intent explained, and discretion reciprocated. The owner’s side has disclosed a private asset; the buyer’s side is expected not to circulate photographs, floor plans or the fact of the sale itself.',
      'The reward for observing the form is access to the inventory that never surfaces. The houses that matter most in any market trade this way — quietly, completely, and between parties who were both vouched for before the door opened.',
    ],
  },
  {
    slug: 'sample-reading-a-guide-price',
    title: 'How to read a guide price',
    excerpt:
      'Exact, band or on request: what each disclosure choice says about the sale, and how to calibrate an opening position against it.',
    paragraphs: [
      'At the top of the market a price is a communication strategy before it is a number. An exact figure signals a seller who has decided; a band signals a seller inviting the market to resolve a range; “price on request” signals that qualification comes before information.',
      'A band is not vagueness — it is usually the honest shape of a thin market, where the last comparable sale is old and the next one is the negotiation you are about to have. The width of the band tells you how much of the price the seller expects the process itself to discover.',
      'Calibrating an opening position therefore starts from the disclosure choice, not the number: against an exact price, precision is met with precision; against a band, an offer places itself inside the seller’s own stated range; against a request-only price, the first move is to become the kind of enquirer the number is released to.',
    ],
  },
];
