import { clsx } from 'clsx';
import { getTranslations } from 'next-intl/server';

import { brand } from '@/config/brand';
import { Link } from '@/i18n/navigation';

interface SiteHeaderProps {
  /** true when the header sits over the hero image (white text, no border). */
  onHero?: boolean;
}

/** Top navigation per the design preview: serif wordmark, uppercase links, bordered CTA.
 *  Desktop shows the full link row + CTA; mobile collapses to a native <details>
 *  menu (no client JS) so the four sections stay reachable on small screens. */
export async function SiteHeader({ onHero = false }: SiteHeaderProps) {
  const t = await getTranslations('nav');

  const links = [
    { href: '/search', label: t('collection') },
    { href: '/destinations', label: t('destinations') },
    { href: '/journal', label: t('journal') },
    { href: '/about', label: t('about') },
  ] as const;

  return (
    <nav
      className={clsx(
        'relative z-header flex items-center justify-between gap-3 px-5 py-4 sm:px-7',
        onHero ? 'text-vellum' : 'border-b border-line bg-vellum text-obsidian',
      )}
    >
      <Link
        href="/"
        className="whitespace-nowrap font-display text-base uppercase tracking-[0.16em] sm:text-lg sm:tracking-[0.22em]"
      >
        {brand.name}
      </Link>

      <ul className="hidden items-center gap-6 text-xs uppercase tracking-[0.12em] md:flex">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="hover:opacity-70">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop CTA */}
      <Link
        href="/list-with-us"
        className="hidden whitespace-nowrap border border-current px-4 py-2 text-xs uppercase tracking-[0.14em] hover:opacity-70 md:inline-block"
      >
        {t('listWithUs')}
      </Link>

      {/* Mobile menu — native <details>, no client JS. */}
      <details className="group relative md:hidden">
        <summary
          aria-label="Menu"
          className="flex cursor-pointer list-none items-center justify-center p-2 [&::-webkit-details-marker]:hidden"
        >
          <span aria-hidden="true" className="flex flex-col gap-1">
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
          </span>
        </summary>
        <div className="absolute right-0 top-full z-header mt-2 flex w-48 flex-col gap-1 border border-line bg-vellum p-2 text-obsidian shadow-pop">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-xs uppercase tracking-[0.12em] hover:bg-bone"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/list-with-us"
            className="mt-1 bg-obsidian px-3 py-2.5 text-center text-xs uppercase tracking-[0.14em] text-vellum"
          >
            {t('listWithUs')}
          </Link>
        </div>
      </details>
    </nav>
  );
}
