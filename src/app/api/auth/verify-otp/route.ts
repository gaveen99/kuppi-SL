import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import {
  OTP_MAX_ATTEMPTS,
  emailKey,
  hashOtpCode,
  isValidEmail,
  normalizeEmail,
} from '@/lib/otp';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

interface SignupData {
  name?: string;
  role?: string;
  level?: string;
  fieldOfStudy?: string;
  institution?: string;
}

type VerifyResult =
  | { status: 'ok' }
  | { status: 'expired' }
  | { status: 'no-token' }
  | { status: 'too-many-attempts' }
  | { status: 'wrong-code' };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const signupData: SignupData | undefined = body.signupData;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email.' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Enter the 6-digit code from your email.' },
        { status: 400 }
      );
    }

    const db = adminDb();
    const docId = emailKey(email);
    const ref = db.collection('otpTokens').doc(docId);
    const submittedHash = hashOtpCode(code, email);

    const result: VerifyResult = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { status: 'no-token' };

      const data = snap.data() as {
        codeHash: string;
        expiresAt: Timestamp;
        attempts: number;
      };

      if (data.attempts >= OTP_MAX_ATTEMPTS) {
        tx.delete(ref);
        return { status: 'too-many-attempts' };
      }

      if (Date.now() > data.expiresAt.toMillis()) {
        tx.delete(ref);
        return { status: 'expired' };
      }

      if (submittedHash !== data.codeHash) {
        tx.update(ref, { attempts: FieldValue.increment(1) });
        return { status: 'wrong-code' };
      }

      tx.delete(ref);
      return { status: 'ok' };
    });

    switch (result.status) {
      case 'no-token':
        return NextResponse.json(
          { error: 'No sign-in code pending for this email. Request a new one.' },
          { status: 400 }
        );
      case 'too-many-attempts':
        return NextResponse.json(
          { error: 'Too many incorrect attempts. Request a new code.' },
          { status: 429 }
        );
      case 'expired':
        return NextResponse.json(
          { error: 'That code has expired. Request a new one.' },
          { status: 400 }
        );
      case 'wrong-code':
        return NextResponse.json(
          { error: 'That code is incorrect. Check your email and try again.' },
          { status: 400 }
        );
      case 'ok':
        break;
    }

    // Get or create the Firebase Auth user.
    const auth = adminAuth();
    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        user = await auth.createUser({ email, emailVerified: true });
      } else {
        throw err;
      }
    }

    // Ensure Firestore user doc exists; create or merge using signupData.
    const userDocRef = db.collection('users').doc(user.uid);
    const userDoc = await userDocRef.get();
    let isNewUser = !userDoc.exists;

    if (isNewUser) {
      await userDocRef.set({
        uid: user.uid,
        email,
        name: signupData?.name || email.split('@')[0],
        role: signupData?.role || 'student',
        level: signupData?.level || 'Other',
        fieldOfStudy: signupData?.fieldOfStudy || '',
        institution: signupData?.institution || null,
        createdAt: Timestamp.now(),
      });
    }

    const customToken = await auth.createCustomToken(user.uid);

    return NextResponse.json({
      ok: true,
      customToken,
      isNewUser,
    });
  } catch (err: any) {
    console.error('verify-otp failed:', err);
    return NextResponse.json(
      { error: 'Could not verify the code. Please try again.' },
      { status: 500 }
    );
  }
}
