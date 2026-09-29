/**
 * §13.10: 8 fictional agencies and 16 agents (2 per house). §13.12: no real
 * agency, agent, address or phone; contact addresses use the reserved
 * example.com domain so nothing can ever deliver; agents render as monogram
 * avatars (§13.2.4) — no portrait media is created at all.
 */

export interface SampleAgency {
  slug: string;
  name: string;
  country: string;
  email: string;
  description: string;
  tier: 'standard' | 'verified';
  destinationSlugs: string[];
}

export interface SampleAgent {
  key: string;
  name: string;
  agencySlug: string;
  role: string;
  email: string;
  languages: string[];
}

export const SAMPLE_AGENCY_SLUG_PREFIX = 'sample-';

export const SAMPLE_AGENCIES: SampleAgency[] = [
  {
    slug: 'sample-maison-delacour',
    name: 'Maison Delacour',
    country: 'FR',
    email: 'maison-delacour@example.com',
    description: 'Sample private house for the Côte d’Azur and the Principality.',
    tier: 'verified',
    destinationSlugs: ['saint-tropez', 'cap-ferrat', 'monaco'],
  },
  {
    slug: 'sample-serravalle-figli',
    name: 'Serravalle & Figli',
    country: 'IT',
    email: 'serravalle-figli@example.com',
    description: 'Sample Italian house for the lakes, the Costa Smeralda and Tuscany.',
    tier: 'verified',
    destinationSlugs: ['lake-como', 'porto-cervo', 'tuscany'],
  },
  {
    slug: 'sample-alpina-reusser',
    name: 'Alpina Reusser',
    country: 'CH',
    email: 'alpina-reusser@example.com',
    description: 'Sample Alpine house for the established winter addresses.',
    tier: 'standard',
    destinationSlugs: ['gstaad', 'courchevel'],
  },
  {
    slug: 'sample-whitmore-hale',
    name: 'Whitmore & Hale',
    country: 'US',
    email: 'whitmore-hale@example.com',
    description: 'Sample American house for Aspen, Palm Beach and the Hamptons.',
    tier: 'verified',
    destinationSlugs: ['aspen', 'palm-beach', 'hamptons'],
  },
  {
    slug: 'sample-pemberton-private-office',
    name: 'Pemberton Private Office',
    country: 'GB',
    email: 'pemberton@example.com',
    description: 'Sample London private office for prime central addresses.',
    tier: 'verified',
    destinationSlugs: ['london'],
  },
  {
    slug: 'sample-alcantara-iberica',
    name: 'Alcántara Ibérica',
    country: 'ES',
    email: 'alcantara-iberica@example.com',
    description: 'Sample Iberian house for Marbella, Ibiza and the Algarve.',
    tier: 'standard',
    destinationSlugs: ['marbella', 'ibiza', 'algarve'],
  },
  {
    slug: 'sample-kalliston-estates',
    name: 'Kalliston Estates',
    country: 'GR',
    email: 'kalliston-estates@example.com',
    description: 'Sample Mediterranean house for Mykonos and the yachting resorts.',
    tier: 'standard',
    destinationSlugs: ['mykonos', 'porto-cervo'],
  },
  {
    slug: 'sample-meridian-private-office',
    name: 'Meridian Private Office',
    country: 'AE',
    email: 'meridian@example.com',
    description: 'Sample private office bridging Dubai and Lake Geneva.',
    tier: 'standard',
    destinationSlugs: ['dubai', 'lake-geneva'],
  },
];

export const SAMPLE_AGENTS: SampleAgent[] = [
  { key: 'sample-agent-01', name: 'Hélène Delacour', agencySlug: 'sample-maison-delacour', role: 'Senior Partner', email: 'helene.delacour@example.com', languages: ['en', 'fr'] },
  { key: 'sample-agent-02', name: 'Aurélien Bosc', agencySlug: 'sample-maison-delacour', role: 'Riviera Director', email: 'aurelien.bosc@example.com', languages: ['en', 'fr', 'ru'] },
  { key: 'sample-agent-03', name: 'Alessandra Serravalle', agencySlug: 'sample-serravalle-figli', role: 'Senior Partner', email: 'alessandra.serravalle@example.com', languages: ['en', 'it', 'fr'] },
  { key: 'sample-agent-04', name: 'Tommaso Ricciardelli', agencySlug: 'sample-serravalle-figli', role: 'Private Office Director', email: 'tommaso.ricciardelli@example.com', languages: ['en', 'it'] },
  { key: 'sample-agent-05', name: 'Béatrice Reusser', agencySlug: 'sample-alpina-reusser', role: 'Alpine Director', email: 'beatrice.reusser@example.com', languages: ['en', 'fr', 'de'] },
  { key: 'sample-agent-06', name: 'Jonas Wildhaber', agencySlug: 'sample-alpina-reusser', role: 'Senior Adviser', email: 'jonas.wildhaber@example.com', languages: ['en', 'de'] },
  { key: 'sample-agent-07', name: 'Eleanor Whitmore', agencySlug: 'sample-whitmore-hale', role: 'Managing Partner', email: 'eleanor.whitmore@example.com', languages: ['en'] },
  { key: 'sample-agent-08', name: 'Marcus Hale', agencySlug: 'sample-whitmore-hale', role: 'Mountain & Coast Director', email: 'marcus.hale@example.com', languages: ['en', 'es'] },
  { key: 'sample-agent-09', name: 'Rupert Pemberton', agencySlug: 'sample-pemberton-private-office', role: 'Principal', email: 'rupert.pemberton@example.com', languages: ['en', 'fr'] },
  { key: 'sample-agent-10', name: 'Priya Chandrasekar', agencySlug: 'sample-pemberton-private-office', role: 'Private Office Director', email: 'priya.chandrasekar@example.com', languages: ['en'] },
  { key: 'sample-agent-11', name: 'Inés Alcántara', agencySlug: 'sample-alcantara-iberica', role: 'Senior Partner', email: 'ines.alcantara@example.com', languages: ['en', 'es'] },
  { key: 'sample-agent-12', name: 'Duarte Figueiral', agencySlug: 'sample-alcantara-iberica', role: 'Algarve Director', email: 'duarte.figueiral@example.com', languages: ['en', 'es', 'fr'] },
  { key: 'sample-agent-13', name: 'Katerina Vassilaki', agencySlug: 'sample-kalliston-estates', role: 'Senior Partner', email: 'katerina.vassilaki@example.com', languages: ['en', 'fr'] },
  { key: 'sample-agent-14', name: 'Stavros Economou', agencySlug: 'sample-kalliston-estates', role: 'Islands Director', email: 'stavros.economou@example.com', languages: ['en', 'de'] },
  { key: 'sample-agent-15', name: 'Leila Nassar', agencySlug: 'sample-meridian-private-office', role: 'Private Office Director', email: 'leila.nassar@example.com', languages: ['en', 'fr'] },
  { key: 'sample-agent-16', name: 'Konstantin Weber', agencySlug: 'sample-meridian-private-office', role: 'Geneva Desk Director', email: 'konstantin.weber@example.com', languages: ['en', 'de', 'ru'] },
];
