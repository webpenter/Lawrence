'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, type FormEvent } from 'react';

const Turnstile = dynamic(
  () => import('@marsidev/react-turnstile').then((mod) => mod.Turnstile),
  { ssr: false },
);

export interface ApplicationLabels {
  agencyName: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  website: string;
  inventoryNote: string;
  consent: string;
  submit: string;
  sending: string;
  success: string;
  error: string;
}

/**
 * §9.4 onboarding — the /sell application form. Mirrors the enquiry form's
 * anti-abuse posture (honeypot, timing, Turnstile) and a11y conventions.
 */
export function AgencyApplicationForm({ labels }: { labels: ApplicationLabels }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [startedAt, setStartedAt] = useState<number | undefined>(undefined);
  useEffect(() => setStartedAt(Date.now()), []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get('consent') !== 'on') {
      setStatus('error');
      return;
    }
    setStatus('sending');
    try {
      const response = await fetch('/api/agency-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyName: data.get('agencyName'),
          contactName: data.get('contactName'),
          email: data.get('email'),
          phone: data.get('phone') || undefined,
          country: data.get('country') || undefined,
          website: data.get('website') || undefined,
          inventoryNote: data.get('inventoryNote') || undefined,
          consent: true,
          website_hp: data.get('website_hp') || undefined,
          startedAt,
          turnstileToken: turnstileToken || undefined,
        }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <p role="status" className="border border-success/40 bg-success/10 p-4 text-sm text-success">
        {labels.success}
      </p>
    );
  }

  const field = 'py-3 rounded-md border border-line bg-vellum px-3 text-base text-ink';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <label className="flex flex-col gap-1 text-sm text-ink">
        {labels.agencyName}
        <input name="agencyName" required minLength={2} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        {labels.contactName}
        <input name="contactName" required minLength={2} autoComplete="name" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        {labels.email}
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        {labels.phone}
        <input name="phone" type="tel" autoComplete="tel" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        {labels.country}
        <input name="country" maxLength={2} autoComplete="country" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        {labels.website}
        <input name="website" type="url" autoComplete="url" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        {labels.inventoryNote}
        <textarea name="inventoryNote" rows={4} className="rounded-md border border-line bg-vellum px-3 py-2 text-base text-ink" />
      </label>
      {/* Honeypot */}
      <input
        type="text"
        name="website_hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="sr-only"
      />
      <label className="flex items-start gap-2 text-xs text-graphite">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4" />
        <span>{labels.consent}</span>
      </label>
      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
        <Turnstile
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          onSuccess={setTurnstileToken}
        />
      ) : null}
      {status === 'error' ? (
        <p role="alert" className="text-xs text-danger">
          {labels.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="bg-obsidian px-4 py-3 text-xs uppercase tracking-[0.14em] text-vellum disabled:opacity-60"
      >
        {status === 'sending' ? labels.sending : labels.submit}
      </button>
    </form>
  );
}
