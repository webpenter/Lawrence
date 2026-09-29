import { clsx } from 'clsx';
import { getTranslations } from 'next-intl/server';

import { brand } from '@/config/brand';
import { Link } from '@/i18n/navigation';

interface SiteHeaderProps {
  /** true when the header sits over the hero image (white text, no border). */
  onHero?: boolean;
}

// The wordmark is the brand constant split for display — never a literal.
const [WORDMARK_TOP, ...rest] = brand.name.split(' ');
const WORDMARK_SUB = rest.join(' ');

/** Top navigation per the design preview: serif wordmark, uppercase links, bordered CTA.
 *  Desktop shows the full link row + CTA; mobile collapses to a native <details>
 *  menu (no client JS) so the four sections stay reachable on small screens. */
export async function SiteHeader({ onHero = false }: SiteHeaderProps) {
  const t = await getTranslations('nav');

  const links = [
    { href: '/collection', label: t('collection') },
    { href: '/off-market', label: t('offMarket') },
    { href: '/markets', label: t('destinations') },
    { href: '/intelligence', label: t('intelligence') },
    { href: '/journal', label: t('journal') },
  ] as const;

  return (
    <nav
      className={clsx(
        'relative w-full',
        onHero ? 'text-white' : 'border-b border-line bg-white text-ink',
      )}
      style={{ zIndex: 'var(--z-index-header)' }}
    >
      <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-5 py-5 md:px-8 lg:px-12">
        <Link
        href="/"
        className="font-display text-lg uppercase tracking-[0.3em] leading-[1.1]"
      >
        {WORDMARK_TOP}
        <small className="block font-body text-[length:var(--text-xs)] uppercase tracking-[0.42em] opacity-75 mt-1">
          {WORDMARK_SUB}
        </small>
      </Link>

      <ul className="hidden items-center gap-5 text-[length:var(--text-xs)] uppercase tracking-label md:flex">
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
        href="/join"
        className="hidden py-1 md:inline-block text-[length:var(--text-xs)] uppercase tracking-label border-b border-current hover:opacity-70"
      >
        {t('join')}
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
        <div
          className="absolute right-0 top-full mt-2 flex w-48 flex-col gap-1 border border-line bg-vellum p-2 text-obsidian shadow-pop"
          style={{ zIndex: 'var(--z-index-header)' }}
        >

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
      </div>
    </nav>
  );
}
