import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sendOtpEmail } from '@/lib/mailer';
import {
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_MINUTES,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  emailKey,
  generateOtpCode,
  hashOtpCode,
  ipKey,
  isValidEmail,
  normalizeEmail,
} from '@/lib/otp';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = typeof body.email === 'string' ? body.email : '';
    const email = normalizeEmail(raw);

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Validate the requested purpose. Anything other than 'signup' falls back
    // to 'login' so unknown/missing values default to the safer (gated) path.
    const rawPurpose = typeof body.purpose === 'string' ? body.purpose : '';
    const purpose: 'login' | 'signup' =
      rawPurpose === 'signup' ? 'signup' : 'login';

    // Note: this existence check leaks whether an email is registered (an
    // enumeration vector). The user explicitly requested this UX so we can
    // redirect unregistered emails to the register page and vice-versa.
    // Trade-off accepted; rate limiting below still throttles abuse.
    try {
      await adminAuth().getUserByEmail(email);
      // User exists.
      if (purpose === 'signup') {
        return NextResponse.json(
          {
            error: 'This email is already registered. Please sign in instead.',
            code: 'already_registered',
          },
          { status: 409 }
        );
      }
    } catch (lookupErr: any) {
      if (lookupErr?.code === 'auth/user-not-found') {
        if (purpose === 'login') {
          return NextResponse.json(
            {
              error: 'No account found for this email. Please create an account first.',
              code: 'not_registered',
            },
            { status: 404 }
          );
        }
        // purpose === 'signup' && user not found: this is the happy path,
        // continue on to rate limit + OTP send.
      } else {
        // Any other lookup error (transient/config) should bubble to the
        // outer try/catch and surface as 500.
        throw lookupErr;
      }
    }

    // Hosts without proxy headers all share the 'unknown' bucket — acceptable
    // trade-off; the alternative (no rate limit) lets bots burn SMTP quota.
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const db = adminDb();
    const rateRef = db.collection('otpRateLimits').doc(ipKey(ip));
    const now = Date.now();

    const rateResult = await db.runTransaction(async (tx) => {
      const snap = await tx.get(rateRef);
      if (!snap.exists) {
        tx.set(rateRef, {
          count: 1,
          windowStartAt: Timestamp.fromMillis(now),
        });
        return { ok: true as const };
      }
      const data = snap.data() as { count: number; windowStartAt: Timestamp };
      const windowStart = data.windowStartAt?.toMillis?.() ?? 0;
      if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
        tx.set(rateRef, {
          count: 1,
          windowStartAt: Timestamp.fromMillis(now),
        });
        return { ok: true as const };
      }
      if (data.count >= RATE_LIMIT_MAX) {
        return { ok: false as const };
      }
      tx.update(rateRef, { count: data.count + 1 });
      return { ok: true as const };
    });

    if (!rateResult.ok) {
      if (ip === 'unknown') {
        console.warn('request-otp: rate limit hit on unknown-IP bucket');
      }
      return NextResponse.json(
        { error: 'Too many sign-in requests from this network. Try again in a few minutes.' },
        { status: 429 }
      );
    }

    const docId = emailKey(email);
    const ref = db.collection('otpTokens').doc(docId);
    const existing = await ref.get();

    if (existing.exists) {
      const data = existing.data() as { createdAt?: Timestamp } | undefined;
      const createdAtMs = data?.createdAt?.toMillis?.() ?? 0;
      const elapsedSec = Math.floor((now - createdAtMs) / 1000);
      if (elapsedSec < OTP_RESEND_COOLDOWN_SECONDS) {
        return NextResponse.json(
          {
            error: `Please wait ${OTP_RESEND_COOLDOWN_SECONDS - elapsedSec}s before requesting another code.`,
            retryAfter: OTP_RESEND_COOLDOWN_SECONDS - elapsedSec,
          },
          { status: 429 }
        );
      }
    }

    const code = generateOtpCode();
    const codeHash = hashOtpCode(code, email);
    const expiresAt = Timestamp.fromMillis(now + OTP_TTL_MINUTES * 60 * 1000);

    await ref.set({
      email,
      codeHash,
      createdAt: Timestamp.fromMillis(now),
      expiresAt,
      attempts: 0,
    });

    try {
      await sendOtpEmail({
        to: email,
        code,
        expiresInMinutes: OTP_TTL_MINUTES,
      });
    } catch (err: any) {
      console.error('Failed to send OTP email:', err);
      // Wipe the token so a new attempt can start cleanly.
      await ref.delete().catch(() => {});
      return NextResponse.json(
        {
          error:
            'We couldn\'t send the sign-in email. The admin needs to configure SMTP (see .env.local.example).',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, expiresInMinutes: OTP_TTL_MINUTES });
  } catch (err: any) {
    console.error('request-otp failed:', err);
    return NextResponse.json(
      { error: err?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
