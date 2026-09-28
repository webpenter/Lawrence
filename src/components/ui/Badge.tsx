import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

// Solid backgrounds with per-tone text colour chosen for WCAG AA contrast (>=4.5:1) — all three
// Lawrence status colours are dark enough to carry vellum text (success 5.9, warning 4.8, danger 7.2).
const TONE_CLASSES = {
  neutral: 'bg-bone text-graphite',
  success: 'bg-success text-vellum',
  warning: 'bg-warning text-vellum',
  danger: 'bg-danger text-vellum',
  sample: 'bg-patina-soft text-ink',
} as const;

export type BadgeTone = keyof typeof TONE_CLASSES;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-sm px-3 py-1 text-xs font-medium uppercase tracking-wide',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
