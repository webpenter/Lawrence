import { clsx } from 'clsx';
import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

const VARIANT_CLASSES = {
  primary: 'bg-obsidian text-bone hover:bg-ink disabled:bg-graphite/40',
  secondary: 'bg-transparent text-obsidian border border-line hover:bg-bone disabled:text-graphite/40',
  ghost: 'bg-transparent text-obsidian hover:bg-bone disabled:text-graphite/40',
} as const;

const SIZE_CLASSES = {
  sm: 'py-1.5 px-3 text-sm',
  md: 'py-2.5 px-4 text-base',
  lg: 'py-3 px-6 text-lg',
} as const;

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-md font-body font-medium transition-colors duration-[var(--motion-fast)] disabled:cursor-not-allowed';

export type ButtonVariant = keyof typeof VARIANT_CLASSES;
export type ButtonSize = keyof typeof SIZE_CLASSES;

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = clsx(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className);

  if ('href' in props && props.href !== undefined) {
    const { href, ...anchorProps } = props;
    return (
      <Link href={href} className={classes} aria-disabled={loading} {...anchorProps}>
        {loading ? <span aria-hidden="true">…</span> : null}
        {children}
      </Link>
    );
  }

  const { disabled, ...buttonProps } = props as ButtonAsButton;
  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...buttonProps}
    >
      {loading ? <span aria-hidden="true">…</span> : null}
      {children}
    </button>
  );
}
