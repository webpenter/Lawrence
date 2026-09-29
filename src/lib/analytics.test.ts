import { describe, expect, it, vi } from 'vitest';
import { sanitizeAnalyticsProps, trackEvent } from './analytics';

describe('Spec §17: Analytics Event Schema & Privacy', () => {
  it('preserves valid event properties without PII', () => {
    const raw = {
      facetsUsed: ['sea', 'berth'],
      resultCount: 42,
      destination: 'cote-d-azur',
      hasPhone: true,
    };
    const clean = sanitizeAnalyticsProps(raw);

    expect(clean.resultCount).toBe(42);
    expect(clean.facetsUsed).toBe('sea,berth');
    expect(clean.destination).toBe('cote-d-azur');
    expect(clean.hasPhone).toBe(true);
  });

  it('drops sensitive keys like email, phone, name, and message', () => {
    const raw = {
      resultCount: 10,
      userEmail: 'buyer@example.com',
      contactPhone: '+1-555-123-4567',
      fullName: 'John Doe',
      message: 'Looking for a villa with private dock',
    };
    const clean = sanitizeAnalyticsProps(raw);

    expect(clean.resultCount).toBe(10);
    expect(clean.userEmail).toBeUndefined();
    expect(clean.contactPhone).toBeUndefined();
    expect(clean.fullName).toBeUndefined();
    expect(clean.message).toBeUndefined();
  });

  it('detects and drops email or phone patterns embedded in string values', () => {
    const raw = {
      filterName: 'buyer@secret.com',
      destination: 'Call me at 555-234-5678',
      comboSlug: 'sea-villas',
    };
    const clean = sanitizeAnalyticsProps(raw);

    expect(clean.filterName).toBeUndefined();
    expect(clean.destination).toBeUndefined();
    expect(clean.comboSlug).toBe('sea-villas');
  });

  it('trackEvent calls window.plausible with sanitized payload', () => {
    const plausibleMock = vi.fn();
    window.plausible = plausibleMock;

    trackEvent('enquiry_submitted', {
      source: 'property_detail',
      hasPhone: false,
      propertyId: 101,
      agencyId: 5,
    });

    expect(plausibleMock).toHaveBeenCalledWith('enquiry_submitted', {
      props: {
        source: 'property_detail',
        hasPhone: false,
        propertyId: 101,
        agencyId: 5,
      },
    });
  });
});
