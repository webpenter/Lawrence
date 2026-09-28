import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border border-line bg-vellum p-6 shadow-card',
        interactive &&
          'transition-shadow duration-[var(--motion-base)] hover:shadow-pop focus-within:shadow-pop',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
