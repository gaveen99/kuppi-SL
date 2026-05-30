import { describe, it, expect } from 'vitest';
import * as otp from '../../src/lib/otp';

const HEX64 = /^[0-9a-f]{64}$/;

describe('generateOtpCode', () => {
  it('returns a string of length 6', () => {
    for (let i = 0; i < 20; i++) {
      const code = otp.generateOtpCode();
      expect(typeof code).toBe('string');
      expect(code.length).toBe(6);
    }
  });

  it('returns only digits', () => {
    for (let i = 0; i < 50; i++) {
      expect(otp.generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });

  it('returns zero-padded values', () => {
    for (let i = 0; i < 500; i++) {
      const code = otp.generateOtpCode();
      expect(code.length).toBe(6);
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it('produces varied output', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      codes.add(otp.generateOtpCode());
    }
    expect(codes.size).toBeGreaterThanOrEqual(30);
  });
});

describe('hashOtpCode', () => {
  it('is deterministic', () => {
    const a = otp.hashOtpCode('123456', 'user@example.com');
    const b = otp.hashOtpCode('123456', 'user@example.com');
    expect(a).toBe(b);
  });

  it('is case-insensitive in email', () => {
    const lower = otp.hashOtpCode('123456', 'alice@x.com');
    const mixed = otp.hashOtpCode('123456', 'Alice@x.com');
    const upper = otp.hashOtpCode('123456', 'ALICE@X.COM');
    expect(mixed).toBe(lower);
    expect(upper).toBe(lower);
  });

  it('produces different hashes for different codes', () => {
    const a = otp.hashOtpCode('111111', 'user@example.com');
    const b = otp.hashOtpCode('222222', 'user@example.com');
    expect(a).not.toBe(b);
  });

  it('produces different hashes for different emails (scoping)', () => {
    const a = otp.hashOtpCode('123456', 'a@example.com');
    const b = otp.hashOtpCode('123456', 'b@example.com');
    expect(a).not.toBe(b);
  });

  it('returns 64-char hex string (sha256)', () => {
    expect(otp.hashOtpCode('123456', 'user@example.com')).toMatch(HEX64);
  });
});

describe('emailKey', () => {
  it('is deterministic', () => {
    expect(otp.emailKey('user@example.com')).toBe(otp.emailKey('user@example.com'));
  });

  it('is case-insensitive', () => {
    const lower = otp.emailKey('user@example.com');
    expect(otp.emailKey('User@Example.com')).toBe(lower);
    expect(otp.emailKey('USER@EXAMPLE.COM')).toBe(lower);
  });

  it('does not trim whitespace (only lowercases)', () => {
    // emailKey only lowercases; it does NOT trim. Verify that surrounding
    // whitespace produces a different key than the trimmed equivalent.
    expect(otp.emailKey(' a@b.com ')).not.toBe(otp.emailKey('a@b.com'));
  });

  it('returns 64-char hex string', () => {
    expect(otp.emailKey('user@example.com')).toMatch(HEX64);
  });
});

describe('normalizeEmail', () => {
  it('trims leading/trailing whitespace', () => {
    expect(otp.normalizeEmail('  user@example.com  ')).toBe('user@example.com');
    expect(otp.normalizeEmail('\tuser@example.com\n')).toBe('user@example.com');
  });

  it('lowercases', () => {
    expect(otp.normalizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
    expect(otp.normalizeEmail('User@Example.Com')).toBe('user@example.com');
  });

  it('chains both trim and lowercase', () => {
    expect(otp.normalizeEmail('  Alice@X.com  ')).toBe('alice@x.com');
  });
});

describe('isValidEmail', () => {
  it('accepts realistic emails', () => {
    expect(otp.isValidEmail('a@b.com')).toBe(true);
    expect(otp.isValidEmail('a.b@c.co.uk')).toBe(true);
    expect(otp.isValidEmail('a+tag@b.com')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(otp.isValidEmail('')).toBe(false);
  });

  it('rejects missing local part', () => {
    expect(otp.isValidEmail('@b.com')).toBe(false);
  });

  it('rejects missing domain', () => {
    expect(otp.isValidEmail('a@')).toBe(false);
  });

  it('rejects domain without TLD', () => {
    expect(otp.isValidEmail('a@b')).toBe(false);
  });

  it('rejects whitespace inside the address', () => {
    expect(otp.isValidEmail('a b@c.com')).toBe(false);
    expect(otp.isValidEmail('a@b .com')).toBe(false);
  });

  it('rejects double @', () => {
    expect(otp.isValidEmail('a@@b.com')).toBe(false);
  });
});

describe.skipIf(!('ipKey' in otp))('ipKey', () => {
  it('is deterministic', () => {
    const ipKey = (otp as typeof otp & { ipKey: (ip: string) => string }).ipKey;
    expect(ipKey('192.168.1.1')).toBe(ipKey('192.168.1.1'));
  });

  it('returns 64-char hex string', () => {
    const ipKey = (otp as typeof otp & { ipKey: (ip: string) => string }).ipKey;
    expect(ipKey('192.168.1.1')).toMatch(HEX64);
  });

  it('different IPs produce different keys', () => {
    const ipKey = (otp as typeof otp & { ipKey: (ip: string) => string }).ipKey;
    expect(ipKey('192.168.1.1')).not.toBe(ipKey('192.168.1.2'));
    expect(ipKey('10.0.0.1')).not.toBe(ipKey('10.0.0.2'));
  });
});

describe.skipIf(!('RATE_LIMIT_MAX' in otp) || !('RATE_LIMIT_WINDOW_MS' in otp))(
  'constants',
  () => {
    it('RATE_LIMIT_MAX is a positive number', () => {
      const value = (otp as typeof otp & { RATE_LIMIT_MAX: number }).RATE_LIMIT_MAX;
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    });

    it('RATE_LIMIT_WINDOW_MS is a positive number representing milliseconds', () => {
      const value = (otp as typeof otp & { RATE_LIMIT_WINDOW_MS: number })
        .RATE_LIMIT_WINDOW_MS;
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    });
  }
);

describe('exported constants', () => {
  it('OTP_LENGTH is 6', () => {
    expect(otp.OTP_LENGTH).toBe(6);
  });

  it('OTP_TTL_MINUTES is a positive number', () => {
    expect(typeof otp.OTP_TTL_MINUTES).toBe('number');
    expect(otp.OTP_TTL_MINUTES).toBeGreaterThan(0);
  });

  it('OTP_RESEND_COOLDOWN_SECONDS is a positive number', () => {
    expect(typeof otp.OTP_RESEND_COOLDOWN_SECONDS).toBe('number');
    expect(otp.OTP_RESEND_COOLDOWN_SECONDS).toBeGreaterThan(0);
  });

  it('OTP_MAX_ATTEMPTS is a positive number', () => {
    expect(typeof otp.OTP_MAX_ATTEMPTS).toBe('number');
    expect(otp.OTP_MAX_ATTEMPTS).toBeGreaterThan(0);
  });
});
