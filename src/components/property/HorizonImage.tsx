import { clsx } from 'clsx';

import type { Media } from '@/payload-types';
import { horizonGradientFor, PHOTO_SCRIM } from '@/tokens/placeholders';

import { MediaImage } from './MediaImage';

interface HorizonImageProps {
  media?: Media | number | null;
  alt?: string;
  seed: string | number;
  sizes?: string;
  priority?: boolean;
  scrim?: boolean;
  className?: string;
}

/**
 * A listing photograph, or the design preview's horizon-gradient stand-in when
 * no media exists yet (§13.2). Always absolutely fills its parent — wrap in an
 * AspectBox or any relatively-positioned container for CLS-free rendering.
 */
export function HorizonImage({
  media,
  alt = '',
  seed,
  sizes,
  priority = false,
  scrim = true,
  className,
}: HorizonImageProps) {
  const resolved = typeof media === 'object' && media !== null ? media : null;

  return (
    <div className={clsx('absolute inset-0 overflow-hidden', className)}>
      {resolved?.url ? (
        <MediaImage
          media={resolved}
          alt={resolved.alt ?? alt}
          sizes={sizes ?? '100vw'}
          priority={priority}
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: horizonGradientFor(seed) }}
        />
      )}
      {scrim ? (
        <div aria-hidden="true" className="absolute inset-0" style={{ background: PHOTO_SCRIM }} />
      ) : null}
    </div>
  );
}
