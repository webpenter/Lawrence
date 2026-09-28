export interface BrandConfig {
  name: string;
  codename: string;
  legalName: string;
  domain: string;
  siteUrl: string;
  tagline: string;
  description: string;
  email: {
    contact: string;
    leads: string;
    noreply: string;
  };
  phone: string;
  whatsapp: string;
  socials: {
    instagram: string;
    linkedin: string;
    youtube: string;
  };
  copyrightYear: number;
}

export const brand: BrandConfig = {
  name: 'Lawrence Private Collection',
  codename: 'Lawrence',
  legalName: 'Lawrence Private Collection Limited',
  domain: 'lawrenceprivatecollection.com',
  siteUrl: process.env['NEXT_PUBLIC_SITE_URL'] || 'https://lawrenceprivatecollection.com',
  tagline: 'Exceptional property, openly and otherwise.',
  description:
    'A portal for exceptional property from roughly €20 million: a fully public Collection, and a members-only Off-Market section.',
  email: {
    contact: 'desk@lawrenceprivatecollection.com',
    leads: process.env['LEAD_NOTIFY_TO'] || 'leads@lawrenceprivatecollection.com',
    noreply: process.env['AGENCY_NOTIFY_FROM'] || 'noreply@lawrenceprivatecollection.com',
  },
  phone: '+44 20 7946 0912',
  whatsapp: '+44 7700 900912',
  socials: {
    instagram: 'https://instagram.com/lawrence.privatecollection',
    linkedin: 'https://linkedin.com/company/lawrence-private-collection',
    youtube: 'https://youtube.com/@lawrence-private-collection',
  },
  copyrightYear: 2026,
};
