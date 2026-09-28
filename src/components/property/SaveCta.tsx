'use client';

import { useRouter } from 'next/navigation';

import { SaveButton } from '@/components/ui/SaveButton';

export interface SaveCtaProps {
  saveLabel: string;
  savedLabel: string;
  joinHref: string;
}

/**
 * §11.3 headline save button. Until the member session arrives (Prompt 9),
 * every viewer is anonymous here — the toggle routes to /join, which is the
 * §12.3 story: saving is one of the two reasons to create an account.
 */
export function SaveCta({ saveLabel, savedLabel, joinHref }: SaveCtaProps) {
  const router = useRouter();
  return (
    <SaveButton
      saved={false}
      saveLabel={saveLabel}
      savedLabel={savedLabel}
      onToggle={() => router.push(joinHref)}
    />
  );
}
