/* eslint-disable waterlineI18n/no-literal-jsx-text -- Payload backoffice UI is English-only, like every admin.description string */
'use client';

import * as React from 'react';
import { useState } from 'react';

/**
 * §9.4 review-queue decision buttons: approve / request changes / reject
 * with a note. Posts to /api/admin/review and reloads the queue.
 */
export function ReviewDecision({ propertyId }: { propertyId: number }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: 'approve' | 'request_changes' | 'reject') {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ propertyId, action, note: note || undefined }),
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!body.ok) {
        setError(body.error ?? 'Decision failed.');
        setBusy(false);
        return;
      }
      window.location.reload();
    } catch {
      setError('Decision failed.');
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Note to the agency (required for changes/reject)"
        rows={2}
        style={{ width: '100%', padding: 8 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" disabled={busy} onClick={() => decide('approve')}>
          Approve &amp; publish
        </button>
        <button
          type="button"
          disabled={busy || note.trim().length === 0}
          onClick={() => decide('request_changes')}
        >
          Request changes
        </button>
        <button
          type="button"
          disabled={busy || note.trim().length === 0}
          onClick={() => decide('reject')}
        >
          Reject
        </button>
      </div>
      {error ? (
        <p style={{ color: 'var(--theme-error-500)', margin: 0 }}>{error}</p>
      ) : null}
    </div>
  );
}

export default ReviewDecision;
