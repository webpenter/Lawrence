import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * §8.5 — optional TOTP 2FA for members, RFC 6238 (SHA-1, 6 digits, 30 s
 * steps: the profile every authenticator app ships with). No dependency:
 * ~40 lines of node crypto beats auditing one.
 */

const STEP_SECONDS = 30;
const DIGITS = 6;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(secret: string): Buffer {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function totpCode(secret: string, timestampMs: number = Date.now()): string {
  const counter = Math.floor(timestampMs / 1000 / STEP_SECONDS);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', base32Decode(secret)).update(buffer).digest();
  const offset = (hmac[hmac.length - 1] as number) & 0x0f;
  const binary =
    (((hmac[offset] as number) & 0x7f) << 24) |
    (((hmac[offset + 1] as number) & 0xff) << 16) |
    (((hmac[offset + 2] as number) & 0xff) << 8) |
    ((hmac[offset + 3] as number) & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/** Verify with ±1 step of clock drift, constant-time per candidate. */
export function verifyTotp(secret: string, code: string, timestampMs: number = Date.now()): boolean {
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  const provided = Buffer.from(normalized);
  for (const drift of [0, -1, 1]) {
    const candidate = Buffer.from(totpCode(secret, timestampMs + drift * STEP_SECONDS * 1000));
    if (provided.length === candidate.length && timingSafeEqual(provided, candidate)) return true;
  }
  return false;
}

/** otpauth:// URI for authenticator-app enrolment. */
export function totpUri(secret: string, accountEmail: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}
