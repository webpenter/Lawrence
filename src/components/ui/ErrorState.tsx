import type { ReactNode } from 'react';

import { Button } from './Button';

export interface ErrorStateProps {
  title: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  children?: ReactNode;
}

export function ErrorState({ title, description, retryLabel = 'Try again', onRetry, children }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-danger/30 bg-danger/5 p-6">
      <h3 className="font-display text-lg text-danger">{title}</h3>
      {description ? <p className="text-sm text-graphite">{description}</p> : null}
      {children}
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
