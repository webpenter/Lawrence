import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components';
import * as React from 'react';

import { brand } from '@/config/brand';
import { tokens } from '@/tokens/tokens';

/**
 * §9.4 Track B transactional emails — token-styled like lead-emails.tsx,
 * plain-text fallback, one CTA. English-only backoffice mail.
 */

const styles = {
  body: {
    backgroundColor: tokens.color.bone,
    fontFamily: tokens.font.body,
    color: tokens.color.ink,
    margin: 0,
    padding: '24px 0',
  },
  container: {
    backgroundColor: tokens.color.vellum,
    border: `1px solid ${tokens.color.line}`,
    maxWidth: '520px',
    padding: '32px',
  },
  wordmark: {
    fontFamily: tokens.font.display,
    letterSpacing: '0.22em',
    textTransform: 'uppercase' as const,
    fontSize: tokens.size.base,
    color: tokens.color.obsidian,
    margin: '0 0 24px',
  },
  heading: {
    fontFamily: tokens.font.display,
    fontWeight: 400,
    fontSize: tokens.size.xl,
    color: tokens.color.ink,
    margin: '0 0 12px',
  },
  text: {
    fontSize: tokens.size.sm,
    lineHeight: '1.55',
    color: tokens.color.graphite,
    margin: '0 0 12px',
  },
  button: {
    backgroundColor: tokens.color.obsidian,
    color: tokens.color.vellum,
    fontSize: tokens.size.xs,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    padding: '12px 24px',
    textDecoration: 'none',
  },
  hr: { borderColor: tokens.color.line, margin: '24px 0' },
  footer: { fontSize: tokens.size.xs, color: tokens.color.graphite, margin: 0 },
};

function Shell({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.wordmark}>{brand.name}</Text>
          {children}
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            {brand.legalName} · {brand.domain}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Onboarding: the set-password email after an application is approved. */
export function AgencySetPasswordEmail({
  contactName,
  agencyName,
  resetUrl,
}: {
  contactName: string;
  agencyName: string;
  resetUrl: string;
}) {
  return (
    <Shell preview={`Set the password for ${agencyName}'s account`}>
      <Heading style={styles.heading}>Welcome to the desk</Heading>
      <Text style={styles.text}>
        {contactName} — the application for {agencyName} has been approved. Your
        agency account is ready; set your password to open the backoffice.
      </Text>
      <Button href={resetUrl} style={styles.button}>
        Set your password
      </Button>
      <Text style={styles.text}>
        The link expires; if it has, request a new one from the sign-in page.
        Complete your agency profile before submitting your first listing.
      </Text>
    </Shell>
  );
}

/** §9.4 moderation outcome: the note that reaches the agency. */
export function ModerationOutcomeEmail({
  listingTitle,
  outcome,
  note,
  dashboardUrl,
}: {
  listingTitle: string;
  outcome: 'approved' | 'changes_requested' | 'rejected';
  note?: string | null;
  dashboardUrl: string;
}) {
  const headline =
    outcome === 'approved'
      ? 'Your listing is live'
      : outcome === 'changes_requested'
        ? 'Changes requested on your listing'
        : 'Your listing was not approved';
  return (
    <Shell preview={`${headline} — ${listingTitle}`}>
      <Heading style={styles.heading}>{headline}</Heading>
      <Text style={styles.text}>{listingTitle}</Text>
      {note ? <Text style={styles.text}>Reviewer note: {note}</Text> : null}
      <Button href={dashboardUrl} style={styles.button}>
        Open the listing
      </Button>
    </Shell>
  );
}

/** §9.4 import summary with the error-CSV link. */
export function ImportSummaryEmail({
  agencyName,
  filename,
  processed,
  created,
  updated,
  failed,
  errorCsvUrl,
}: {
  agencyName: string;
  filename: string;
  processed: number;
  created: number;
  updated: number;
  failed: number;
  errorCsvUrl: string | null;
}) {
  return (
    <Shell preview={`Import finished: ${created} created, ${updated} updated, ${failed} failed`}>
      <Heading style={styles.heading}>Import complete</Heading>
      <Text style={styles.text}>
        {agencyName} — {filename}: {processed} rows processed, {created} created,{' '}
        {updated} updated, {failed} failed. Imported listings enter the review
        queue; nothing publishes without moderation.
      </Text>
      {errorCsvUrl ? (
        <Button href={errorCsvUrl} style={styles.button}>
          Download the error CSV
        </Button>
      ) : null}
    </Shell>
  );
}
