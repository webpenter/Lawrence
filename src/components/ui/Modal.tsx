'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { IconButton } from './IconButton';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      className="z-modal w-full max-w-lg rounded-lg border border-line bg-vellum p-6 shadow-pop backdrop:bg-ink/60"
      aria-labelledby="modal-title"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id="modal-title" className="font-display text-xl text-obsidian">
          {title}
        </h2>
        <IconButton
          icon={
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          }
          label="Close"
          size="sm"
          onClick={onClose}
        />
      </div>
      <div className="mt-4">{children}</div>
    </dialog>
  );
}
