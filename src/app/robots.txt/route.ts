import { NextResponse } from 'next/server';

import { siteBase } from '@/lib/seo/sitemap';

export const revalidate = 3600;

// §14.6 crawler policy, decided once (DECISIONS.md): AI crawlers are ALLOWED
// on public content — discovery is worth more than the content — and
// disallowed exactly where humans are too: admin, APIs, and search-filter
// URLs (only landing pages are indexable representations of filtered
// inventory, §5.5).
const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended'];

export function GET(): NextResponse {
  const lines: string[] = [
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /*/collection?*',
    'Disallow: /dev/',
    '',
    ...AI_CRAWLERS.flatMap((bot) => [
      `User-agent: ${bot}`,
      'Disallow: /admin',
      'Disallow: /api/',
      'Disallow: /*/collection?*',
      '',
    ]),
    `Sitemap: ${siteBase()}/sitemap.xml`,
    '',
  ];
  return new NextResponse(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600' },
  });
}
