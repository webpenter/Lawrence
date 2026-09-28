'use client';

import { clsx } from 'clsx';

export interface SaveButtonProps {
  saved: boolean;
  /** Accessible label when not saved, e.g. "Save this property" */
  saveLabel: string;
  /** Accessible label when saved, e.g. "Saved — remove from your list" */
  savedLabel: string;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * §10.5 — quiet save toggle for listings. A real button with aria-pressed;
 * the filled state uses the single warm accent.
 */
export function SaveButton({
  saved,
  saveLabel,
  savedLabel,
  onToggle,
  disabled = false,
  className,
}: SaveButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? savedLabel : saveLabel}
      title={saved ? savedLabel : saveLabel}
      disabled={disabled}
      onClick={onToggle}
      className={clsx(
        'inline-flex h-10 w-10 items-center justify-center rounded-md border transition-colors duration-[var(--motion-fast)]',
        saved
          ? 'border-patina bg-patina text-vellum hover:bg-ink hover:border-ink'
          : 'border-line bg-transparent text-graphite hover:border-patina hover:text-patina',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.2L5 21V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
