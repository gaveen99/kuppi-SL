import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import {
  sendContactEmail,
  type ContactCategory,
} from '@/lib/mailer';
import { ipKey, isValidEmail, normalizeEmail } from '@/lib/otp';

export const runtime = 'nodejs';

const CONTACT_RATE_LIMIT_MAX = 5;
const CONTACT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const VALID_CATEGORIES: ContactCategory[] = [
  'inquiry',
  'feedback',
  'complaint',
  'other',
];

const MAX_NAME = 120;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Honeypot — bots fill hidden fields humans never see.
    if (typeof body.website === 'string' && body.website.length > 0) {
      // Pretend it worked so scrapers don't iterate.
      return NextResponse.json({ ok: true });
    }

    const rawName = typeof body.name === 'string' ? body.name.trim() : '';
    const rawEmail = typeof body.email === 'string' ? body.email : '';
    const rawSubject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';
    const rawCategory = typeof body.category === 'string' ? body.category : '';
    const uid = typeof body.uid === 'string' ? body.uid.slice(0, 64) : undefined;

    const email = normalizeEmail(rawEmail);
    const category = (VALID_CATEGORIES as string[]).includes(rawCategory)
      ? (rawCategory as ContactCategory)
      : 'inquiry';

    if (!rawName) {
      return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
    }
    if (rawName.length > MAX_NAME) {
      return NextResponse.json({ error: 'Name is too long.' }, { status: 400 });
    }
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }
    if (!rawSubject) {
      return NextResponse.json({ error: 'Please enter a subject.' }, { status: 400 });
    }
    if (rawSubject.length > MAX_SUBJECT) {
      return NextResponse.json({ error: 'Subject is too long.' }, { status: 400 });
    }
    if (rawMessage.length < 10) {
      return NextResponse.json(
        { error: 'Please add a few more details (at least 10 characters).' },
        { status: 400 }
      );
    }
    if (rawMessage.length > MAX_MESSAGE) {
      return NextResponse.json(
        { error: `Message is too long (max ${MAX_MESSAGE} characters).` },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = req.headers.get('user-agent') || undefined;

    const db = adminDb();
    const rateRef = db.collection('contactRateLimits').doc(ipKey(ip));
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
      if (now - windowStart > CONTACT_RATE_LIMIT_WINDOW_MS) {
        tx.set(rateRef, {
          count: 1,
          windowStartAt: Timestamp.fromMillis(now),
        });
        return { ok: true as const };
      }
      if (data.count >= CONTACT_RATE_LIMIT_MAX) {
        return { ok: false as const };
      }
      tx.update(rateRef, { count: data.count + 1 });
      return { ok: true as const };
    });

    if (!rateResult.ok) {
      return NextResponse.json(
        {
          error:
            'Too many messages from this network. Please try again in a little while.',
        },
        { status: 429 }
      );
    }

    try {
      await sendContactEmail({
        fromName: rawName,
        fromEmail: email,
        category,
        subject: rawSubject,
        message: rawMessage,
        pageContext: '/contact',
        uid,
        ip: ipKey(ip),
        userAgent,
      });
    } catch (err: any) {
      console.error('Failed to send contact email:', err);
      return NextResponse.json(
        {
          error:
            "We couldn't send your message right now. Please try again later, or email us directly.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('contact form failed:', err);
    return NextResponse.json(
      { error: err?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
