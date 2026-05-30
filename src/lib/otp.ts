import { createHash, randomInt } from 'crypto';

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_MAX = 10;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export function generateOtpCode(): string {
  // Cryptographically secure 6-digit code, zero-padded.
  const n = randomInt(0, 1_000_000);
  return n.toString().padStart(OTP_LENGTH, '0');
}

export function hashOtpCode(code: string, email: string): string {
  // Scoped to email so a token from one account can't be replayed against another.
  return createHash('sha256').update(`${email.toLowerCase()}:${code}`).digest('hex');
}

export function emailKey(email: string): string {
  // Firestore doc id — hash the email so it's a safe key and doesn't leak PII in URLs/logs.
  return createHash('sha256').update(email.toLowerCase()).digest('hex');
}

export function ipKey(ip: string): string {
  // Hashed so raw IP never lands in Firestore.
  return createHash('sha256').update(ip).digest('hex');
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  // Sensible, not perfect.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
