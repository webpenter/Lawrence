import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

import { brand } from '@/config/brand';
import { tokens } from '@/tokens/tokens';

/**
 * §11.5 transactional emails: token-styled, plain-text fallback (via
 * render(..., { plainText: true })), one CTA, no images beyond the wordmark.
 * Changing tokens.ts restyles these along with the site (§9.2 acceptance).
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
  label: {
    fontSize: tokens.size.xs,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    color: tokens.color.graphite,
    margin: '16px 0 2px',
  },
  value: {
    fontSize: tokens.size.sm,
    color: tokens.color.ink,
    margin: 0,
  },
  cta: {
    backgroundColor: tokens.color.obsidian,
    color: tokens.color.vellum,
    fontSize: tokens.size.xs,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    padding: '12px 24px',
    textDecoration: 'none',
  },
  hr: { borderColor: tokens.color.line, margin: '24px 0' },
  footer: { fontSize: tokens.size.xs, color: tokens.color.graphite },
} as const;

function Shell({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html>
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

export interface LeadEmailProps {
  enquirerName: string;
  enquirerEmail: string;
  enquirerPhone?: string;
  message?: string;
  listingTitle?: string;
  listingUrl?: string;
}

/** Lead → agency/agent (§11.5 "lead to agency"). Reply-to is the enquirer. */
export function LeadToAgencyEmail(props: LeadEmailProps) {
  return (
    <Shell preview={`New enquiry${props.listingTitle ? ` — ${props.listingTitle}` : ''}`}>
      <Heading style={styles.heading}>New enquiry</Heading>
      {props.listingTitle ? (
        <>
          <Text style={styles.label}>Listing</Text>
          <Text style={styles.value}>{props.listingTitle}</Text>
        </>
      ) : null}
      <Text style={styles.label}>From</Text>
      <Text style={styles.value}>
        {props.enquirerName} · {props.enquirerEmail}
        {props.enquirerPhone ? ` · ${props.enquirerPhone}` : ''}
      </Text>
      {props.message ? (
        <>
          <Text style={styles.label}>Message</Text>
          <Text style={styles.value}>{props.message}</Text>
        </>
      ) : null}
      <Section style={{ marginTop: '24px' }}>
        <Button style={styles.cta} href={`mailto:${props.enquirerEmail}`}>
          Reply to the enquirer
        </Button>
      </Section>
      <Text style={{ ...styles.footer, marginTop: '16px' }}>
        Replying to this email reaches the enquirer directly.
      </Text>
    </Shell>
  );
}

/** Confirmation to the enquirer (§11.5 "lead confirmation"). */
export function LeadConfirmationEmail(props: LeadEmailProps) {
  return (
    <Shell preview="Your enquiry has been sent">
      <Heading style={styles.heading}>Your enquiry has been sent</Heading>
      <Text style={styles.text}>
        {props.listingTitle
          ? `The listing agency for "${props.listingTitle}" has received your enquiry and will reply to you directly.`
          : 'Our desk has received your enquiry and will route it to the right agency.'}
      </Text>
      {props.listingUrl ? (
        <Section style={{ marginTop: '24px' }}>
          <Button style={styles.cta} href={props.listingUrl}>
            View the listing
          </Button>
        </Section>
      ) : null}
    </Shell>
  );
}

export interface LeadReminderProps {
  listingTitle?: string;
  enquirerName: string;
  receivedAt: string;
  dashboardUrl: string;
}

/** 48 h unanswered reminder to the agency (§8.9/§11.5). */
export function LeadReminderEmail(props: LeadReminderProps) {
  return (
    <Shell preview="An enquiry is waiting for a reply">
      <Heading style={styles.heading}>An enquiry is waiting</Heading>
      <Text style={styles.text}>
        {props.enquirerName}
        {props.listingTitle ? ` asked about "${props.listingTitle}"` : ' sent an enquiry'} on{' '}
        {props.receivedAt} and has not had a reply. Response time feeds your agency tier.
      </Text>
      <Section style={{ marginTop: '24px' }}>
        <Button style={styles.cta} href={props.dashboardUrl}>
          Open your leads
        </Button>
      </Section>
    </Shell>
  );
}
