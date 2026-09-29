import { NextResponse } from 'next/server';

import { siteBase } from '@/lib/seo/sitemap';

export const revalidate = 3600;

// §15.6 crawler policy, decided once (DECISIONS.md): AI crawlers are ALLOWED
// on public content — discovery is worth more than the content — and
// disallowed exactly where humans are too: admin, APIs, filter URLs, and the
// member area. robots.txt is one of the §15.3 three independent layers
// keeping /off-market and /account out of crawlers (with X-Robots-Tag and
// authentication behind it).
const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended'];

const DISALLOW = [
  'Disallow: /admin',
  'Disallow: /api/',
  'Disallow: /*/collection?*',
  'Disallow: /*/off-market',
  'Disallow: /*/account',
  'Disallow: /off-market',
  'Disallow: /account',
];

export function GET(): NextResponse {
  const lines: string[] = [
    'User-agent: *',
    ...DISALLOW,
    'Disallow: /dev/',
    '',
    ...AI_CRAWLERS.flatMap((bot) => [`User-agent: ${bot}`, ...DISALLOW, '']),
    `Sitemap: ${siteBase()}/sitemap.xml`,
    '',
  ];
  return new NextResponse(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600' },
  });
}
