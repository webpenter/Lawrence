import { getPayloadClient } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export interface AnonymizeResult {
  success: boolean;
  leadId: number | string;
  anonymizedAt: string;
}

export interface RetentionSweepResult {
  leadsAnonymized: number;
  importJobsPurged: number;
  auditLogsPurged: number;
  executedAt: string;
}

/**
 * Spec §16.4 GDPR One-Click Lead Anonymisation Action.
 * Scrubs name, email, phone, message, and consent IP into anonymized placeholders
 * while preserving aggregate metadata (property, agency, locale, source, createdAt).
 */
export async function anonymizeLead(
  leadId: number | string,
  actor?: { id: number; email?: string; role?: string; agency?: number | { id: number } | null } | null,
): Promise<AnonymizeResult> {
  const payload = await getPayloadClient();
  const idNum = typeof leadId === 'string' ? parseInt(leadId, 10) : leadId;

  const lead = await payload.findByID({
    collection: 'enquiries',
    id: idNum,
    overrideAccess: true,
  });

  if (!lead) {
    throw new Error(`Lead ${leadId} not found`);
  }

  const anonymizedAt = new Date().toISOString();

  await payload.update({
    collection: 'enquiries',
    id: idNum,
    overrideAccess: true,
    data: {
      name: '[ANONYMIZED]',
      email: `anonymized-${idNum}@privacy.lawrence.internal`,
      phone: undefined,
      message: '[ANONYMIZED_PER_GDPR_REQUEST]',
      consent: {
        consentMarketing: false,
        consentedAt: lead.consent?.consentedAt,
        consentIp: '[ANONYMIZED]',
      },
      utm: undefined,
    },
  });

  // Audit trail (§16.2): logAudit reads req.payload and req.user, so hand it
  // a request-shaped object carrying both — anything less writes nothing.
  await logAudit(
    { payload, user: actor ?? null } as Parameters<typeof logAudit>[0],
    'lead_anonymized',
    'leads',
    idNum,
    actor?.email ? `GDPR anonymisation by ${actor.email}` : 'GDPR anonymisation (retention sweep)',
  );

  return {
    success: true,
    leadId: idNum,
    anonymizedAt,
  };
}

/**
 * Spec §16.5 Scheduled Data Retention Policy:
 * - Leads: 24 months, then anonymized.
 * - Import job files: 90 days.
 * - Audit log: 24 months.
 */
export async function runRetentionSweep(): Promise<RetentionSweepResult> {
  const payload = await getPayloadClient();
  const now = Date.now();

  const MS_24_MONTHS = 24 * 30 * 24 * 60 * 60 * 1000;
  const MS_90_DAYS = 90 * 24 * 60 * 60 * 1000;

  const cutoffLeads = new Date(now - MS_24_MONTHS).toISOString();
  const cutoffImportJobs = new Date(now - MS_90_DAYS).toISOString();
  const cutoffAuditLogs = new Date(now - MS_24_MONTHS).toISOString();

  let leadsAnonymized = 0;
  let importJobsPurged = 0;
  let auditLogsPurged = 0;

  // 1. Find leads older than 24 months that are not already anonymized
  try {
    const oldLeads = await payload.find({
      collection: 'enquiries',
      where: {
        createdAt: { less_than: cutoffLeads },
      },
      limit: 100,
      overrideAccess: true,
    });

    for (const lead of oldLeads.docs) {
      if (typeof lead.email === 'string' && lead.email.includes('@privacy.lawrence.internal')) {
        continue;
      }
      await anonymizeLead(lead.id);
      leadsAnonymized++;
    }
  } catch (err) {
    console.warn('[retention] lead anonymization sweep error:', err);
  }

  // 2. Delete import jobs older than 90 days
  try {
    const oldJobs = await payload.delete({
      collection: 'import-jobs',
      where: {
        createdAt: { less_than: cutoffImportJobs },
      },
      overrideAccess: true,
    });
    importJobsPurged = Array.isArray(oldJobs.docs) ? oldJobs.docs.length : 0;
  } catch (err) {
    console.warn('[retention] import job purge error:', err);
  }

  // 3. Delete audit logs older than 24 months
  try {
    const oldAuditLogs = await payload.delete({
      collection: 'audit-logs',
      where: {
        createdAt: { less_than: cutoffAuditLogs },
      },
      overrideAccess: true,
    });
    auditLogsPurged = Array.isArray(oldAuditLogs.docs) ? oldAuditLogs.docs.length : 0;
  } catch (err) {
    console.warn('[retention] audit log purge error:', err);
  }

  return {
    leadsAnonymized,
    importJobsPurged,
    auditLogsPurged,
    executedAt: new Date().toISOString(),
  };
}
