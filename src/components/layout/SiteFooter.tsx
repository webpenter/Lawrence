import { getLocale, getTranslations } from 'next-intl/server';

import { brand } from '@/config/brand';
import { Link } from '@/i18n/navigation';
import { getDestinationCounts, type Locale } from '@/lib/db';
import { FALLBACK_DESTINATIONS, sampleFallbackEnabled } from '@/lib/sample/fallback';

import { PreferenceBar } from './PreferenceBar';

interface FooterDestination {
  name: string;
  slug: string;
}

async function topDestinations(locale: string): Promise<FooterDestination[]> {
  try {
    const counts = await getDestinationCounts(locale as Locale);
    return counts
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map(({ name, slug }) => ({ name, slug }));
  } catch {
    return sampleFallbackEnabled()
      ? FALLBACK_DESTINATIONS.slice(0, 4).map(({ name, slug }) => ({ name, slug }))
      : [];
  }
}

/**
 * Abyss footer per the design preview `.foot`: four equal columns (two on
 * mobile) — Destinations · Water · Company · preferences-and-legal, uppercase
 * micro-headers, white/70 rows on abyss.
 */
export async function SiteFooter() {
  const t = await getTranslations('footer');
  const nav = await getTranslations('nav');
  const home = await getTranslations('home');
  const destinations = await topDestinations(await getLocale());

  const waterLinks = [
    { href: '/search?water=sea', label: home('waterSea') },
    { href: '/search?water=lake', label: home('waterLake') },
    { href: '/search?water=river,canal', label: home('waterRiverCanal') },
    { href: '/search?type=private_island', label: home('waterPrivateIslands') },
  ] as const;

  const companyLinks = [
    { href: '/about', label: nav('about') },
    { href: '/journal', label: nav('journal') },
    { href: '/list-with-us', label: nav('listWithUs') },
    { href: '/contact', label: nav('contact') },
  ] as const;

  const heading =
    'mb-2 text-[length:var(--text-xs)] font-medium uppercase tracking-[0.16em] text-vellum';

  return (
    <footer className="bg-obsidian px-7 py-7 text-xs text-vellum/70">
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        <div>
          <h2 className={heading}>{t('destinationsTitle')}</h2>
          {destinations.length > 0 ? (
            destinations.map((destination) => (
              <p key={destination.slug} className="mb-1">
                <Link href={`/destinations/${destination.slug}`} className="hover:text-vellum">
                  {destination.name}
                </Link>
              </p>
            ))
          ) : (
            <p className="mb-1">
              <Link href="/destinations" className="hover:text-vellum">
                {nav('destinations')}
              </Link>
            </p>
          )}
        </div>

        <div>
          <h2 className={heading}>{t('waterTitle')}</h2>
          {waterLinks.map((link) => (
            <p key={link.href} className="mb-1">
              <Link href={link.href} className="hover:text-vellum">
                {link.label}
              </Link>
            </p>
          ))}
        </div>

        <div>
          <h2 className={heading}>{t('companyTitle')}</h2>
          {companyLinks.map((link) => (
            <p key={link.href} className="mb-1">
              <Link href={link.href} className="hover:text-vellum">
                {link.label}
              </Link>
            </p>
          ))}
        </div>

        <div>
          {/* Preview: the column header IS the preference summary. */}
          <div className="mb-2">
            <PreferenceBar dark />
          </div>
          <p className="mb-1">
            <Link href="/legal/privacy" className="hover:text-vellum">
              {t('legalPrivacy')}
            </Link>
            {' · '}
            <Link href="/legal/cookies" className="hover:text-vellum">
              {t('legalCookies')}
            </Link>
            {' · '}
            <Link href="/legal/terms" className="hover:text-vellum">
              {t('legalTerms')}
            </Link>
          </p>
          <p className="mt-3 text-vellum/70">
            © {brand.copyrightYear} {brand.legalName}
          </p>
        </div>
      </div>
    </footer>
  );
}
