'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

interface LoginFormLabels {
  title: string;
  fieldEmail: string;
  fieldPassword: string;
  submit: string;
  sending: string;
  error: string;
  magicLinkAlternative: string;
}

export function LoginForm({ locale, labels }: { locale: string; labels: LoginFormLabels }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get('returnTo') ?? `/${locale}/off-market`;
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = data.get('email');
    const password = data.get('password');

    try {
      const res = await fetch('/api/members/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Failed to login');

      trackEvent('member_login', { locale });
      
      router.push(returnTo);
      router.refresh();
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 max-w-md w-full">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-medium tracking-display text-ink">{labels.title}</h1>
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-ink">
          {labels.fieldEmail}
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-md border border-line bg-vellum px-3 py-3 text-base text-ink"
          />
        </label>
        
        <label className="flex flex-col gap-1 text-sm text-ink">
          {labels.fieldPassword}
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-line bg-vellum px-3 py-3 text-base text-ink"
          />
        </label>
      </div>

      {status === 'error' && (
        <p className="text-sm text-danger">{labels.error}</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="bg-obsidian px-6 py-4 text-xs uppercase tracking-[0.14em] text-vellum disabled:opacity-60"
      >
        {status === 'sending' ? labels.sending : labels.submit}
      </button>

      <p className="text-sm text-graphite text-center mt-2">
        <a href={`/${locale}/join`} className="underline">
          {labels.magicLinkAlternative}
        </a>
      </p>
    </form>
  );
}
