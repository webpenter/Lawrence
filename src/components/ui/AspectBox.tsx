import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

const RATIO_CLASSES = {
  hero: 'aspect-[21/9]',
  heroMobile: 'aspect-[4/5]',
  card: 'aspect-[4/3]',
  gallery: 'aspect-[3/2]',
  editorial: 'aspect-[16/9]',
} as const;

export type AspectRatioPreset = keyof typeof RATIO_CLASSES;

export interface AspectBoxProps extends HTMLAttributes<HTMLDivElement> {
  ratio: AspectRatioPreset;
}

export function AspectBox({ ratio, className, children, ...props }: AspectBoxProps) {
  return (
    <div className={clsx('relative w-full overflow-hidden', RATIO_CLASSES[ratio], className)} {...props}>
      {children}
    </div>
  );
}
