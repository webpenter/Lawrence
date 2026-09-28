'use client';

import { useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { trackEvent } from '@/lib/analytics';

interface JoinFormLabels {
  title: string;
  checkEmailTitle: string;
  checkEmailBody: string;
  sub: string;
  fieldEmail: string;
  fieldPassword: string;
  optionalBlock: string;
  consentOptIn: string;
  magicLinkAlternative: string;
  submit: string;
  sending: string;
  error: string;
}

export function JoinForm({ locale, labels }: { locale: string; labels: JoinFormLabels }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'error' | 'sent'>('idle');
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = data.get('email');
    const password = data.get('password');
    const marketingConsent = data.get('consent') === 'on';
    

    try {
      // §8.5: join creates the account; the off-market collection opens after
      // the one-click email confirmation — never before.
      const createRes = await fetch('/api/member/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          marketingConsent,
          preferredLocale: locale,
          turnstileToken,
        }),
      });
      if (!createRes.ok) throw new Error('Failed to create account');

      trackEvent('member_joined', { locale });
      setStatus('sent');
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="flex w-full flex-col">
        <h1 className="mb-2.5 font-display text-2xl font-light leading-[1.15] text-ink">
          {labels.checkEmailTitle}
        </h1>
        <p className="max-w-[42ch] text-sm text-graphite">{labels.checkEmailBody}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col">
      <h1 className="mb-2.5 font-display text-2xl font-light leading-[1.15] text-ink">{labels.title}</h1>
      <p className="mb-5 max-w-[42ch] text-sm text-graphite">{labels.sub}</p>

      <input
        name="email"
        type="email"
        placeholder={labels.fieldEmail}
        required
        autoComplete="email"
        className="mb-3 border border-line bg-white px-3.5 py-3 text-[length:var(--text-xs)] text-ink placeholder:text-graphite focus:border-patina focus:outline-none"
      />
      
      <input
        name="password"
        type="password"
        placeholder={labels.fieldPassword}
        required
        autoComplete="new-password"
        className="mb-3 border border-line bg-white px-3.5 py-3 text-[length:var(--text-xs)] text-ink placeholder:text-graphite focus:border-patina focus:outline-none"
      />
      
      <label className="my-1.5 mb-4 flex items-start gap-2 text-[length:var(--text-xs)] text-graphite">
        <input 
          type="checkbox" 
          name="consent" 
          className="mt-0.5 size-3.5 flex-none appearance-none border border-line bg-white checked:bg-obsidian" 
        />
        <span>{labels.consentOptIn}</span>
      </label>

      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
        <Turnstile 
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} 
          onSuccess={setTurnstileToken}
        />
      )}

      {status === 'error' && (
        <p className="mb-3 text-sm text-danger">{labels.error}</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="mt-0 block w-full bg-obsidian p-3 text-center text-[length:var(--text-xs)] uppercase tracking-label text-white disabled:opacity-60"
      >
        {status === 'sending' ? labels.sending : labels.submit}
      </button>

      {/* The magic-link route mounts with Prompt 9 (src/lib/member/magic-link.ts). */}
      <div className="mt-3.5 text-center text-[length:var(--text-xs)] text-ink underline decoration-patina underline-offset-4">
        {labels.magicLinkAlternative}
      </div>

      <p className="mt-5 text-[length:var(--text-xs)] uppercase leading-[1.6] tracking-[0.2em] text-graphite">
        {labels.optionalBlock}
      </p>
    </form>
  );
}
