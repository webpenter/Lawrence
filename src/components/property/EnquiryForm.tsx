'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import { trackEvent } from '@/lib/analytics';
import { leadSchema } from '@/lib/schemas/lead';

interface EnquiryFormLabels {
  name: string;
  email: string;
  phone: string;
  message: string;
  consent: string;
  submit: string;
  sending: string;
  success: string;
  error: string;
  consentRequired: string;
  errorSummary: string;
  errorName: string;
  errorEmail: string;
}

interface EnquiryFormProps {
  /** Omitted for landing-page/contact leads — routed to the internal desk. */
  propertyId?: number;
  source?: 'property' | 'landing' | 'contact' | 'list_with_us';
  locale: string;
  labels: EnquiryFormLabels;
}

type FieldName = 'name' | 'email' | 'consent';

/**
 * The listing enquiry form (§10.3, copy §11.2). Posts to /api/leads with a
 * honeypot; consent is mandatory before anything is sent. All labels arrive
 * translated as props — no intl runtime on the client.
 *
 * §15 form accessibility: labels are real <label>s, every failed submit
 * focuses an error summary whose entries link to their fields, and invalid
 * fields carry aria-invalid + aria-describedby pointing at their message.
 */
export function EnquiryForm({ propertyId, source = 'property', locale, labels }: EnquiryFormProps) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const summaryRef = useRef<HTMLDivElement>(null);
  const idBase = useId();
  // Anti-bot timing check: stamped after hydration so SSR markup stays stable.
  const [startedAt, setStartedAt] = useState<number | undefined>(undefined);
  useEffect(() => setStartedAt(Date.now()), []);

  const fieldId = (field: FieldName) => `${idBase}-${field}`;
  const errorId = (field: FieldName) => `${idBase}-${field}-error`;

  function validate(data: FormData): Partial<Record<FieldName, string>> {
    const errors: Partial<Record<FieldName, string>> = {};
    if (String(data.get('name') ?? '').trim().length < 2) errors.name = labels.errorName;
    const email = String(data.get('email') ?? '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = labels.errorEmail;
    if (data.get('consent') !== 'on') errors.consent = labels.consentRequired;
    return errors;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const errors = validate(data);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStatus('idle');
      // Focus lands on the summary after it renders (§15).
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setFieldErrors({});

    const candidate = {
      name: data.get('name'),
      email: data.get('email'),
      phone: data.get('phone') || undefined,
      message: data.get('message') || undefined,
      propertyId,
      source,
      consent: true as const,
      locale,
      website: data.get('website') || undefined,
      startedAt,
    };

    // Shared-schema validation (client side of /src/lib/schemas/lead.ts);
    // the API re-validates authoritatively.
    const parsed = leadSchema.safeParse(candidate);
    if (!parsed.success) {
      setStatus('error');
      return;
    }

    setStatus('sending');
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) throw new Error(String(response.status));
      // §17: no personal data in the payload — source and shape only.
      trackEvent('lead_submitted', {
        source,
        hasPhone: Boolean(parsed.data.phone),
        propertyId,
      });
      setStatus('success');
      form.reset();
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

  const errorEntries = Object.entries(fieldErrors) as Array<[FieldName, string]>;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      {errorEntries.length > 0 ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          <p className="font-medium">{labels.errorSummary}</p>
          <ul className="mt-1 list-inside list-disc">
            {errorEntries.map(([field, message]) => (
              <li key={field}>
                <a
                  href={`#${fieldId(field)}`}
                  className="underline"
                  onClick={(event) => {
                    event.preventDefault();
                    document.getElementById(fieldId(field))?.focus();
                  }}
                >
                  {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <label className="flex flex-col gap-1 text-sm text-ink" htmlFor={fieldId('name')}>
        {labels.name}
        <input
          id={fieldId('name')}
          name="name"
          required
          minLength={2}
          autoComplete="name"
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? errorId('name') : undefined}
          className="py-3 rounded-md border border-line bg-vellum px-3 text-base text-ink"
        />
        {fieldErrors.name ? (
          <span id={errorId('name')} className="text-xs text-danger">
            {fieldErrors.name}
          </span>
        ) : null}
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink" htmlFor={fieldId('email')}>
        {labels.email}
        <input
          id={fieldId('email')}
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? errorId('email') : undefined}
          className="py-3 rounded-md border border-line bg-vellum px-3 text-base text-ink"
        />
        {fieldErrors.email ? (
          <span id={errorId('email')} className="text-xs text-danger">
            {fieldErrors.email}
          </span>
        ) : null}
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        {labels.phone}
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          className="py-3 rounded-md border border-line bg-vellum px-3 text-base text-ink"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        {labels.message}
        <textarea
          name="message"
          rows={4}
          className="rounded-md border border-line bg-vellum px-3 py-2 text-base text-ink"
        />
      </label>
      {/* Honeypot: visually hidden, tab-skipped; bots fill it, humans never see it. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="sr-only"
      />
      <label className="flex items-start gap-2 text-xs text-graphite" htmlFor={fieldId('consent')}>
        <input
          id={fieldId('consent')}
          type="checkbox"
          name="consent"
          aria-invalid={fieldErrors.consent ? true : undefined}
          aria-describedby={fieldErrors.consent ? errorId('consent') : undefined}
          className="mt-0.5 size-4"
        />
        <span>{labels.consent}</span>
      </label>
      {fieldErrors.consent ? (
        <p id={errorId('consent')} className="text-xs text-danger">
          {fieldErrors.consent}
        </p>
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
