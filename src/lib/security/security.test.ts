import { describe, expect, it } from 'vitest';
import { getSecurityHeaders } from '@/lib/security/headers';
import { scrubPii, scrubPiiFromObject } from '@/lib/security/sentry';
import { verifyWebhookSignature } from '@/lib/security/webhooks';
import { checkRateLimit } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';

describe('Phase 13 Prompt 18 — Security Unit Tests', () => {
  describe('Security Headers & CSP', () => {
    it('generates Grade A security headers including strict CSP', () => {
      const headers = getSecurityHeaders();

      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
      expect(headers['Content-Security-Policy']).toContain('https://plausible.io');
      expect(headers['Content-Security-Policy']).toContain('https://browser.sentry-cdn.com');
      expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      // X-XSS-Protection is deliberately absent — the legacy auditor it
      // enables introduced XS-leak vectors and modern browsers ignore it.
      expect(headers['X-XSS-Protection']).toBeUndefined();
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      // The stack's actual tile/style host must be reachable or the map dies.
      expect(headers['Content-Security-Policy']).toContain('https://api.maptiler.com');
      expect(headers['Permissions-Policy']).toContain('geolocation=()');
      expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
    });
  });

  describe('PII Scrubbing for Sentry & Error Logging', () => {
    it('scrubs email addresses, phone numbers, IPs, and bearer tokens from strings', () => {
      const raw = 'User john.doe@example.com with IP 192.168.1.50 phone +1 (555) 234-5678 secret bearer=abc123xyz';
      const clean = scrubPii(raw);

      expect(clean).not.toContain('john.doe@example.com');
      expect(clean).toContain('[EMAIL_REDACTED]');

      expect(clean).not.toContain('192.168.1.50');
      expect(clean).toContain('[IP_REDACTED]');

      expect(clean).not.toContain('abc123xyz');

      expect(clean).not.toContain('+1 (555) 234-5678');
      expect(clean).toContain('[PHONE_REDACTED]');
    });

    it('scrubs PII recursively from object structures', () => {
      const data = {
        name: 'Jane Doe',
        email: 'jane@waterline.com',
        nested: {
          password: 'super-secret-pass',
          token: 'jwt-token-value',
          info: 'Call +39 02 1234 5678',
        },
      };

      const sanitized = scrubPiiFromObject(data);

      expect(sanitized.email).toBe('[EMAIL_REDACTED]');
      expect(sanitized.nested.password).toBe('[REDACTED]');
      expect(sanitized.nested.token).toBe('[REDACTED]');
      expect(sanitized.nested.info).toContain('[PHONE_REDACTED]');
    });
  });

  describe('Signed Webhook Secret Verification', () => {
    it('verifies revalidate, cron, and feed ingest secrets using timing-safe comparison', () => {
      process.env.REVALIDATE_SECRET = 'my_revalidate_secret_123';
      process.env.CRON_SECRET = 'my_cron_secret_456';

      const validReq = new NextRequest('http://localhost:3000/api/revalidate?secret=my_revalidate_secret_123', {
        method: 'POST',
      });
      expect(verifyWebhookSignature(validReq, 'revalidate')).toBe(true);

      const invalidReq = new NextRequest('http://localhost:3000/api/revalidate?secret=wrong_secret', {
        method: 'POST',
      });
      expect(verifyWebhookSignature(invalidReq, 'revalidate')).toBe(false);

      const cronReq = new NextRequest('http://localhost:3000/api/cron/retention', {
        method: 'GET',
        headers: { authorization: 'Bearer my_cron_secret_456' },
      });
      expect(verifyWebhookSignature(cronReq, 'cron')).toBe(true);
    });
  });

  describe('Rate Limiter', () => {
    it('enforces limit, remaining count, and resets', () => {
      const namespace = 'test-rate-limit-' + Date.now();
      const config = { windowMs: 60000, max: 3 };

      const req = new NextRequest('http://localhost:3000/api/enquiry', {
        headers: { 'x-forwarded-for': '10.0.0.1' },
      });

      const res1 = checkRateLimit(req, namespace, config);
      expect(res1.success).toBe(true);
      expect(res1.remaining).toBe(2);

      const res2 = checkRateLimit(req, namespace, config);
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = checkRateLimit(req, namespace, config);
      expect(res3.success).toBe(true);
      expect(res3.remaining).toBe(0);

      const res4 = checkRateLimit(req, namespace, config);
      expect(res4.success).toBe(false);
      expect(res4.remaining).toBe(0);
    });
  });
});
