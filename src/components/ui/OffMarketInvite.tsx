import { clsx } from 'clsx';
import Link from 'next/link';

export interface OffMarketInviteProps {
  /** Small-caps label, e.g. "Held off-market" */
  label: string;
  /** The count line, e.g. "41 properties are held off-market." */
  message: string;
  /** The single link, e.g. "Create an account to view them." */
  ctaLabel: string;
  href: string;
  className?: string;
}

/**
 * §10.4 — where an off-market listing would appear in a public context, render
 * a single quiet line: small-caps label, a count, one link. Never a blurred
 * card, never a lock icon, never a modal.
 */
export function OffMarketInvite({ label, message, ctaLabel, href, className }: OffMarketInviteProps) {
  return (
    <p
      className={clsx(
        'flex flex-wrap items-baseline gap-x-3 gap-y-1 border-y border-line py-4 font-body',
        className,
      )}
    >
      <span className="text-xs uppercase tracking-label text-graphite">{label}</span>
      <span className="text-sm text-ink">{message}</span>
      {/* patina text on bone is 4.49:1 — a hair under AA — so the accent lives in the underline */}
      <Link
        href={href}
        className="text-sm text-ink underline decoration-patina underline-offset-4 transition-colors duration-[var(--motion-fast)] hover:decoration-ink"
      >
        {ctaLabel}
      </Link>
    </p>
  );
}
