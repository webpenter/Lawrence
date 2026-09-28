import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

const SIZE_CLASSES = {
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-4',
} as const;

export type IconButtonSize = keyof typeof SIZE_CLASSES;

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  size?: IconButtonSize;
}

export function IconButton({
  icon,
  label,
  size = 'md',
  className,
  disabled,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center rounded-full text-obsidian transition-colors duration-[var(--motion-fast)] hover:bg-bone disabled:cursor-not-allowed disabled:text-graphite/40',
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
