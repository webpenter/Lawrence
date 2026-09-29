import { describe, expect, it } from 'vitest';

import { needsUnansweredReminder, resolveLeadRecipients } from './routing';

const full = {
  agentEmail: 'agent@a.example',
  agentReceivesLeads: true,
  agencyEmail: 'inbox@a.example',
  internalDesk: 'desk@lawrence.example',
};

describe('resolveLeadRecipients (§2054: desk first, then the listing agent)', () => {
  it('notifies the desk first and the receiving agent second', () => {
    expect(resolveLeadRecipients(full)).toEqual([
      { to: 'desk@lawrence.example', tier: 'desk' },
      { to: 'agent@a.example', tier: 'agent' },
    ]);
  });

  it('falls back to the agency inbox when the agent opted out', () => {
    expect(resolveLeadRecipients({ ...full, agentReceivesLeads: false })).toEqual([
      { to: 'desk@lawrence.example', tier: 'desk' },
      { to: 'inbox@a.example', tier: 'agency' },
    ]);
  });

  it('falls back to the agency inbox when there is no agent', () => {
    expect(resolveLeadRecipients({ ...full, agentEmail: null })).toEqual([
      { to: 'desk@lawrence.example', tier: 'desk' },
      { to: 'inbox@a.example', tier: 'agency' },
    ]);
  });

  it('routes desk-only enquiries (contact/sell/desk_call) to the desk alone', () => {
    expect(resolveLeadRecipients({ internalDesk: 'desk@lawrence.example' })).toEqual([
      { to: 'desk@lawrence.example', tier: 'desk' },
    ]);
  });

  it('deduplicates when the desk doubles as the agency inbox', () => {
    expect(
      resolveLeadRecipients({
        internalDesk: 'desk@lawrence.example',
        agencyEmail: 'DESK@lawrence.example',
      }),
    ).toEqual([{ to: 'desk@lawrence.example', tier: 'desk' }]);
  });

  it('returns an empty list with nothing configured', () => {
    expect(resolveLeadRecipients({})).toEqual([]);
  });
});

describe('needsUnansweredReminder (48 h SLA)', () => {
  const now = new Date('2026-09-29T12:00:00.000Z');

  it('reminds on a 49-hour-old sent enquiry, once', () => {
    const createdAt = new Date(now.getTime() - 49 * 60 * 60 * 1000).toISOString();
    expect(needsUnansweredReminder({ status: 'sent', createdAt }, now)).toBe(true);
    expect(
      needsUnansweredReminder({ status: 'sent', createdAt, reminderSentAt: createdAt }, now),
    ).toBe(false);
  });

  it('never reminds on answered or fresh enquiries', () => {
    const fresh = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    expect(needsUnansweredReminder({ status: 'sent', createdAt: fresh }, now)).toBe(false);
    const old = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
    expect(needsUnansweredReminder({ status: 'qualified', createdAt: old }, now)).toBe(false);
  });
});
