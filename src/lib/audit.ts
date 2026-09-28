import type { PayloadRequest } from 'payload';

import { relationId } from '@/payload/access/tenant';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'publish'
  | 'enquiry_view'
  | 'enquiry_anonymized'
  | 'lead_view'
  | 'lead_anonymized'
  | 'status_change';

/**
 * Append an AuditLog entry (spec §6.8: who changed what, when — required for
 * multi-agency trust). Uses the local API with overrideAccess so the log can
 * be written on behalf of any actor while staying read-protected. Never throws:
 * an audit failure must not fail the audited operation, but it is logged loudly.
 */
export async function logAudit(
  req: PayloadRequest,
  action: AuditAction,
  targetCollection: string,
  targetId: string | number,
  summary?: string,
): Promise<void> {
  try {
    const user = req.user as
      | { id: number; email?: string; role?: string; agency?: number | { id: number } }
      | null;
    await req.payload.create({
      collection: 'audit-logs',
      overrideAccess: true,
      data: {
        action,
        targetCollection,
        targetId: String(targetId),
        summary: summary ?? null,
        actor: user?.id ?? null,
        actorEmail: user?.email ?? 'system',
        actorRole: user?.role ?? 'system',
        agency: relationId(user?.agency) ?? null,
      },
    });
  } catch (err) {
    console.error('[audit] failed to write audit log entry:', err);
  }
}
