'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { SaveButton } from '@/components/ui/SaveButton';

export interface SaveCtaProps {
  propertyId: number;
  saveLabel: string;
  savedLabel: string;
  joinHref: string;
}

/**
 * §11.3 headline save button. Members toggle through /api/member/saved;
 * anonymous clicks route to /join — saving is one of the two reasons to
 * create an account (§12.3). Initial state loads quietly after mount so the
 * page itself stays fully static.
 */
export function SaveCta({ propertyId, saveLabel, savedLabel, joinHref }: SaveCtaProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/member/saved?property=${propertyId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { saved?: boolean } | null) => {
        if (!cancelled && data?.saved) setSaved(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/member/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      if (res.status === 401) {
        router.push(joinHref);
        return;
      }
      const data = (await res.json()) as { saved?: boolean };
      setSaved(Boolean(data.saved));
    } catch {
      // A failed toggle keeps the previous state — nothing to shout about.
    } finally {
      setBusy(false);
    }
  }

  return (
    <SaveButton
      saved={saved}
      disabled={busy}
      saveLabel={saveLabel}
      savedLabel={savedLabel}
      onToggle={() => void toggle()}
    />
  );
}
