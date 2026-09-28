import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

/**
 * §10.5 Section — the standard page band: horizontal padding per the §10.3
 * margin rule (≥32px mobile, 96px large screens) and vertical rhythm.
 */
export function Section({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={clsx('px-5 py-10 sm:px-7 lg:px-24', className)} {...props}>
      {children}
    </section>
  );
}
