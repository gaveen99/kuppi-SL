import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

// Called after client-side Google sign-in to create a Firestore user doc
// on first login. Trust comes from verifying the Firebase ID token server-side.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const idToken: string | undefined = body.idToken;
    const profile = (body.profile ?? {}) as {
      name?: string;
      role?: string;
      level?: string;
      fieldOfStudy?: string;
      institution?: string;
    };

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const decoded = await adminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email;

    if (!email) {
      return NextResponse.json(
        { error: 'Account has no email. Cannot create profile.' },
        { status: 400 }
      );
    }

    const db = adminDb();
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();

    if (snap.exists) {
      return NextResponse.json({ ok: true, isNewUser: false });
    }

    await userRef.set({
      uid,
      email,
      name: profile.name || decoded.name || email.split('@')[0],
      role: profile.role || 'student',
      level: profile.level || 'Other',
      fieldOfStudy: profile.fieldOfStudy || '',
      institution: profile.institution || null,
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ ok: true, isNewUser: true });
  } catch (err: any) {
    console.error('ensure-user failed:', err);
    return NextResponse.json(
      { error: 'Could not complete sign-in. Please try again.' },
      { status: 500 }
    );
  }
}
