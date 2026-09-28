'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface AccountLabels {
  reqBudgetMin: string;
  reqBudgetMax: string;
  reqTimeline: string;
  reqNotify: string;
  reqSave: string;
  reqSaved: string;
  prefMarketing: string;
  prefSave: string;
  totpTitle: string;
  totpIntro: string;
  totpStart: string;
  totpSecretLabel: string;
  totpCode: string;
  totpConfirm: string;
  totpEnabled: string;
  deleteTitle: string;
  deleteConfirm: string;
  genericError: string;
}

interface RequirementInitial {
  budgetMinEur?: number | null;
  budgetMaxEur?: number | null;
  timeline?: string | null;
  notifyByEmail?: boolean | null;
}

const TIMELINES = ['immediate', '6_months', '12_months', 'opportunistic'] as const;

const inputClass =
  'border border-line bg-white px-3.5 py-3 text-[length:var(--text-xs)] text-ink focus:border-patina focus:outline-none';
const buttonClass =
  'inline-block bg-obsidian px-5 py-2.5 text-[length:var(--text-xs)] uppercase tracking-label text-white disabled:opacity-60';

/** §11.7 — requirements profile (§8.5 step 5). */
export function RequirementsForm({
  labels,
  initial,
  timelineLabels,
}: {
  labels: AccountLabels;
  initial: RequirementInitial | null;
  timelineLabels: Record<string, string>;
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('saving');
    const data = new FormData(event.currentTarget);
    const num = (name: string) => {
      const raw = String(data.get(name) ?? '').trim();
      return raw ? Number(raw) : null;
    };
    try {
      const res = await fetch('/api/member/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetMinEur: num('budgetMinEur'),
          budgetMaxEur: num('budgetMaxEur'),
          timeline: String(data.get('timeline') ?? '') || null,
          notifyByEmail: data.get('notifyByEmail') === 'on',
        }),
      });
      setState(res.ok ? 'saved' : 'error');
    } catch {
      setState('error');
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[length:var(--text-xs)] uppercase tracking-label text-graphite">
          {labels.reqBudgetMin}
          <input
            name="budgetMinEur"
            type="number"
            min={0}
            defaultValue={initial?.budgetMinEur ?? ''}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-[length:var(--text-xs)] uppercase tracking-label text-graphite">
          {labels.reqBudgetMax}
          <input
            name="budgetMaxEur"
            type="number"
            min={0}
            defaultValue={initial?.budgetMaxEur ?? ''}
            className={inputClass}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-[length:var(--text-xs)] uppercase tracking-label text-graphite">
        {labels.reqTimeline}
        <select name="timeline" defaultValue={initial?.timeline ?? ''} className={inputClass}>
          <option value="" />
          {TIMELINES.map((value) => (
            <option key={value} value={value}>
              {timelineLabels[value] ?? value}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-graphite">
        <input
          type="checkbox"
          name="notifyByEmail"
          defaultChecked={initial?.notifyByEmail ?? true}
        />
        {labels.reqNotify}
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={state === 'saving'} className={buttonClass}>
          {labels.reqSave}
        </button>
        {state === 'saved' ? <span className="text-sm text-success">{labels.reqSaved}</span> : null}
        {state === 'error' ? (
          <span className="text-sm text-danger">{labels.genericError}</span>
        ) : null}
      </div>
    </form>
  );
}

/** §11.7 — email preferences. */
export function PreferencesForm({
  labels,
  marketingConsent,
}: {
  labels: AccountLabels;
  marketingConsent: boolean;
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('saving');
    const data = new FormData(event.currentTarget);
    try {
      const res = await fetch('/api/member/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketingConsent: data.get('marketingConsent') === 'on' }),
      });
      setState(res.ok ? 'saved' : 'error');
    } catch {
      setState('error');
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm text-graphite">
        <input type="checkbox" name="marketingConsent" defaultChecked={marketingConsent} />
        {labels.prefMarketing}
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={state === 'saving'} className={buttonClass}>
          {labels.prefSave}
        </button>
        {state === 'saved' ? <span className="text-sm text-success">{labels.reqSaved}</span> : null}
        {state === 'error' ? (
          <span className="text-sm text-danger">{labels.genericError}</span>
        ) : null}
      </div>
    </form>
  );
}

/** §8.5 — optional TOTP enrolment. */
export function TotpSection({ labels, enabled }: { labels: AccountLabels; enabled: boolean }) {
  const [uri, setUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [done, setDone] = useState(enabled);
  const [error, setError] = useState(false);

  async function start() {
    setError(false);
    const res = await fetch('/api/member/totp/setup', { method: 'POST' });
    if (!res.ok) {
      setError(true);
      return;
    }
    const data = (await res.json()) as { secret: string; uri: string };
    setSecret(data.secret);
    setUri(data.uri);
  }

  async function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(false);
    const data = new FormData(event.currentTarget);
    const res = await fetch('/api/member/totp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: String(data.get('code') ?? '') }),
    });
    if (res.ok) setDone(true);
    else setError(true);
  }

  if (done) return <p className="text-sm text-success">{labels.totpEnabled}</p>;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-graphite">{labels.totpIntro}</p>
      {!secret ? (
        <button type="button" onClick={() => void start()} className={buttonClass}>
          {labels.totpStart}
        </button>
      ) : (
        <form onSubmit={confirm} className="flex flex-col gap-3">
          <p className="text-sm text-graphite">{labels.totpSecretLabel}</p>
          <code className="break-all border border-line bg-white p-3 text-sm tabular-nums text-ink">
            {secret}
          </code>
          {uri ? <p className="sr-only">{uri}</p> : null}
          <label className="flex flex-col gap-1 text-[length:var(--text-xs)] uppercase tracking-label text-graphite">
            {labels.totpCode}
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              className={inputClass}
            />
          </label>
          <button type="submit" className={buttonClass}>
            {labels.totpConfirm}
          </button>
        </form>
      )}
      {error ? <p className="text-sm text-danger">{labels.genericError}</p> : null}
    </div>
  );
}

/** §8.5 step 6 — self-service deletion, two clicks. */
export function DeleteAccountButton({ labels, locale }: { labels: AccountLabels; locale: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch('/api/member/delete', { method: 'POST' });
      if (res.ok) {
        router.push(`/${locale}`);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="border border-danger px-4 py-2 text-[length:var(--text-xs)] uppercase tracking-label text-danger hover:bg-danger/10"
      >
        {labels.deleteTitle}
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void remove()}
      className="bg-danger px-4 py-2 text-[length:var(--text-xs)] uppercase tracking-label text-white disabled:opacity-60"
    >
      {labels.deleteConfirm}
    </button>
  );
}
