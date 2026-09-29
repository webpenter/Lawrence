'use client';

import { useCallback, useEffect, useRef } from 'react';

export interface LightboxImage {
  src: string;
  srcSet?: string;
  alt: string;
}

export interface LightboxLabels {
  dialog: string;
  close: string;
  prev: string;
  next: string;
  /** Counter template with {n} and {count} placeholders — serializable across the RSC boundary. */
  counterTemplate: string;
}

interface LightboxProps {
  images: LightboxImage[];
  currentIndex: number;
  labels: LightboxLabels;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/**
 * Full-screen photo lightbox (§10.3, §12.2 rule 3, §15).
 * Loaded only via next/dynamic ssr:false from the gallery, so it never enters
 * the listing route's first-load bundle. Keyboard contract per §15: arrows
 * navigate, Esc closes, focus is trapped inside and the counter is announced.
 * Focus restoration to the opening trigger is the caller's job (it knows the
 * trigger element); all strings arrive translated as props (CLAUDE.md rule 7).
 */
export function Lightbox({ images, currentIndex, labels, onClose, onNavigate }: LightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowRight' && currentIndex < images.length - 1) {
        onNavigate(currentIndex + 1);
      } else if (event.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      } else if (event.key === 'Tab') {
        // Focus trap: cycle among the dialog's buttons only.
        const focusables = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button');
        if (!focusables || focusables.length === 0) return;
        const list = Array.from(focusables);
        const active = document.activeElement as HTMLElement | null;
        const index = list.findIndex((el) => el === active);
        let nextIndex = index + (event.shiftKey ? -1 : 1);
        if (index === -1) nextIndex = 0;
        if (nextIndex >= list.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = list.length - 1;
        event.preventDefault();
        list[nextIndex]?.focus();
      }
    },
    [currentIndex, images.length, onClose, onNavigate],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  if (images.length === 0) return null;
  const current = images[Math.min(currentIndex, images.length - 1)];

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={labels.dialog}
      className="fixed inset-0 flex items-center justify-center bg-obsidian/95 p-4"
      style={{ zIndex: 'var(--z-index-modal)' }}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label={labels.close}
        className="absolute right-4 top-4 z-10 flex p-3 items-center justify-center rounded-sm bg-vellum/10 text-vellum hover:bg-vellum/20"
      >
        <span aria-hidden="true">×</span>
      </button>

      {currentIndex > 0 ? (
        <button
          type="button"
          onClick={() => onNavigate(currentIndex - 1)}
          aria-label={labels.prev}
          className="absolute left-4 top-1/2 flex p-3 -translate-y-1/2 items-center justify-center rounded-sm bg-vellum/10 text-vellum hover:bg-vellum/20"
        >
          <span aria-hidden="true">‹</span>
        </button>
      ) : null}

      <figure className="relative max-h-[85vh] max-w-[90vw]">
        {/* eslint-disable-next-line @next/next/no-img-element -- variant srcSet from the upload ladder; next/image runtime stays out of budgeted routes */}
        <img
          src={current.src}
          srcSet={current.srcSet}
          sizes="90vw"
          alt={current.alt}
          className="max-h-[85vh] max-w-[90vw] object-contain"
        />
        <figcaption
          aria-live="polite"
          className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-obsidian/70 px-3 py-1 text-xs text-vellum"
        >
          {labels.counterTemplate
            .replace('{n}', String(currentIndex + 1))
            .replace('{count}', String(images.length))}
        </figcaption>
      </figure>

      {currentIndex < images.length - 1 ? (
        <button
          type="button"
          onClick={() => onNavigate(currentIndex + 1)}
          aria-label={labels.next}
          className="absolute right-4 top-1/2 flex p-3 -translate-y-1/2 items-center justify-center rounded-sm bg-vellum/10 text-vellum hover:bg-vellum/20"
        >
          <span aria-hidden="true">›</span>
        </button>
      ) : null}
    </div>
  );
}
