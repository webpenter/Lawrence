/**
 * §8.9/§22-11A enquiry routing and SLA logic, pure and unit-tested. The
 * route handler and crons apply these decisions.
 */

export interface RoutingCandidates {
  agentEmail?: string | null;
  agentReceivesLeads?: boolean | null;
  agencyEmail?: string | null;
  internalDesk?: string | null;
}

export interface LeadRecipient {
  to: string;
  tier: 'desk' | 'agent' | 'agency';
}

/**
 * The decided routing (DECISIONS/§2054): the DESK first, then the listing
 * agent — both are notified. The agency inbox stands in when the property
 * has no receiving agent. Deduplicated, desk-first order.
 */
export function resolveLeadRecipients(candidates: RoutingCandidates): LeadRecipient[] {
  const recipients: LeadRecipient[] = [];
  if (candidates.internalDesk) {
    recipients.push({ to: candidates.internalDesk, tier: 'desk' });
  }
  if (candidates.agentEmail && candidates.agentReceivesLeads !== false) {
    recipients.push({ to: candidates.agentEmail, tier: 'agent' });
  } else if (candidates.agencyEmail) {
    recipients.push({ to: candidates.agencyEmail, tier: 'agency' });
  }
  const seen = new Set<string>();
  return recipients.filter((recipient) => {
    const key = recipient.to.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const UNANSWERED_REMINDER_MS = 48 * 60 * 60 * 1000;

export interface ReminderCandidate {
  status: string;
  createdAt: string;
  reminderSentAt?: string | null;
}

/** §8.9: an enquiry sitting in new/sent for 48 h earns the recipients one reminder. */
export function needsUnansweredReminder(lead: ReminderCandidate, now: Date): boolean {
  if (!['new', 'sent'].includes(lead.status)) return false;
  if (lead.reminderSentAt) return false;
  const createdAt = new Date(lead.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;
  return now.getTime() - createdAt.getTime() >= UNANSWERED_REMINDER_MS;
}
