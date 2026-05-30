'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';

interface SignupProfile {
  name?: string;
  role?: User['role'];
  level?: User['level'];
  fieldOfStudy?: string;
  institution?: string;
}

interface RequestOtpResult {
  ok: true;
  expiresInMinutes: number;
}

interface VerifyOtpResult {
  ok: true;
  isNewUser: boolean;
}

interface GoogleSignInResult {
  ok: true;
  isNewUser: boolean;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  /**
   * True while a signInWithRedirect cycle is still completing on this page
   * (Google sent us back, but getRedirectResult hasn't finished yet). Sign-in
   * pages use this to show a "Signing you in…" state instead of flashing the
   * auth form for a few seconds before the redirect-out effect fires.
   */
  processingRedirect: boolean;
  /** Non-user-initiated auth errors (e.g., from a failed redirect return). */
  authError: string | null;
  clearAuthError: () => void;
  requestEmailOtp: (
    email: string,
    purpose?: 'login' | 'signup'
  ) => Promise<RequestOtpResult>;
  verifyEmailOtp: (
    email: string,
    code: string,
    signupData?: SignupProfile
  ) => Promise<VerifyOtpResult>;
  signInWithGoogle: (profile?: SignupProfile) => Promise<GoogleSignInResult>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

function humanizeAuthError(err: any): string {
  const code: string = err?.code || '';
  const msg: string = err?.message || '';
  switch (code) {
    case 'auth/unauthorized-domain':
      return `This site (${typeof window !== 'undefined' ? window.location.hostname : ''}) is not yet authorised in Firebase. The admin needs to add it under Authentication → Settings → Authorized domains.`;
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Please allow popups or try again; we will fall back to a full-page redirect.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled. Please try again.';
    case 'auth/network-request-failed':
      return 'Network error while signing in. Check your connection and try again.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
      return 'Firebase is misconfigured (API key). Please contact support.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled for this project. The admin needs to enable it in Firebase Console → Authentication → Sign-in method.';
    case 'auth/web-storage-unsupported':
      return 'Your browser is blocking storage (private mode or third-party cookies). Enable cross-site tracking / cookies for this site and try again.';
    case 'auth/internal-error':
      return `Internal auth error. ${msg}`;
    default:
      return msg || 'Sign-in failed. Please try again.';
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PENDING_GOOGLE_PROFILE_KEY = 'kuppi:pendingGoogleProfile';

function readPendingGoogleProfile(): SignupProfile {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(PENDING_GOOGLE_PROFILE_KEY);
    if (!raw) return {};
    window.sessionStorage.removeItem(PENDING_GOOGLE_PROFILE_KEY);
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as SignupProfile) : {};
  } catch {
    return {};
  }
}

function writePendingGoogleProfile(profile: SignupProfile | undefined) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      PENDING_GOOGLE_PROFILE_KEY,
      JSON.stringify(profile ?? {})
    );
  } catch {
    // ignore quota / disabled storage
  }
}

async function loadUserDoc(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as User;
}

async function ensureUserDoc(
  idToken: string,
  profile: SignupProfile
): Promise<{ isNewUser: boolean }> {
  const res = await fetch('/api/auth/ensure-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, profile }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Could not complete Google sign-in.');
  }
  return (await res.json()) as { isNewUser: boolean };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  // If sessionStorage still holds the redirect handoff key, we're returning
  // from a Google signInWithRedirect and the result is still being processed.
  // Initialized lazily so the first render of consumers already has the flag.
  const [processingRedirect, setProcessingRedirect] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem(PENDING_GOOGLE_PROFILE_KEY) !== null;
    } catch {
      return false;
    }
  });
  const clearAuthError = () => setAuthError(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fu) => {
      setFirebaseUser(fu);
      if (fu) {
        const profile = await loadUserDoc(fu.uid);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Handle the response after returning from signInWithRedirect. On mobile
  // browsers (iOS Safari in particular) popup auth is blocked, so we ask
  // Firebase to do a full-page redirect instead. When the user returns from
  // Google with a successful auth, this effect runs once, fetches the ID
  // token, and hits /api/auth/ensure-user to create or refresh the user doc.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!result || cancelled) return;
        const profile = readPendingGoogleProfile();
        const idToken = await result.user.getIdToken();
        await ensureUserDoc(idToken, profile);
        // ensureUserDoc may have just created the user document. onAuthStateChanged
        // already fired loadUserDoc against an empty doc and stashed null. Re-fetch
        // so the login page sees the populated profile and routes the user off.
        const fresh = await loadUserDoc(result.user.uid);
        if (!cancelled) setUser(fresh);
      } catch (err: any) {
        console.warn('[auth] getRedirectResult failed:', err?.code, err?.message);
        if (!cancelled) setAuthError(humanizeAuthError(err));
      } finally {
        if (!cancelled) setProcessingRedirect(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUser = async () => {
    if (!firebaseUser) return;
    const profile = await loadUserDoc(firebaseUser.uid);
    setUser(profile);
  };

  const requestEmailOtp = async (
    email: string,
    purpose: 'login' | 'signup' = 'login'
  ): Promise<RequestOtpResult> => {
    const res = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const err = new Error(
        data.error || 'Could not send sign-in code.'
      ) as Error & { code?: string };
      if (data?.code) err.code = data.code;
      throw err;
    }
    return (await res.json()) as RequestOtpResult;
  };

  const verifyEmailOtp = async (
    email: string,
    code: string,
    signupData?: SignupProfile
  ): Promise<VerifyOtpResult> => {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, signupData }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Could not verify code.');
    }
    const data = (await res.json()) as {
      customToken: string;
      isNewUser: boolean;
    };
    await signInWithCustomToken(auth, data.customToken);
    // onAuthStateChanged will populate user, but refresh to make sure.
    return { ok: true, isNewUser: data.isNewUser };
  };

  const signInWithGoogle = async (
    profile?: SignupProfile
  ): Promise<GoogleSignInResult> => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // Try popup first on every device. signInWithRedirect breaks on mobile
    // Chrome/Safari when the Firebase authDomain (<project-id>.firebaseapp.com) is a
    // different eTLD+1 than the app domain: ITP / third-party cookie
    // partitioning blocks the cross-site storage the redirect handoff relies
    // on, and getRedirectResult returns null. Popup OAuth communicates via
    // window.opener / postMessage (same-origin), so it isn't affected.
    try {
      const cred = await signInWithPopup(auth, provider);
      const idToken = await cred.user.getIdToken();
      const data = await ensureUserDoc(idToken, profile ?? {});
      await refreshUser();
      return { ok: true, isNewUser: data.isNewUser };
    } catch (err: any) {
      console.warn('[auth] Google sign-in failed:', err?.code, err?.message);
      // Fall back to full-page redirect when a popup can't be opened
      // (e.g. PWA standalone on iOS, embedded webview, popup blocker).
      if (
        err?.code === 'auth/popup-blocked' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/operation-not-supported-in-this-environment'
      ) {
        writePendingGoogleProfile(profile);
        setProcessingRedirect(true);
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectErr: any) {
          console.warn('[auth] Google sign-in failed:', redirectErr?.code, redirectErr?.message);
          setProcessingRedirect(false);
          const human = humanizeAuthError(redirectErr);
          setAuthError(human);
          throw new Error(human);
        }
        return { ok: true, isNewUser: false };
      }
      const human = humanizeAuthError(err);
      setAuthError(human);
      throw new Error(human);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    processingRedirect,
    authError,
    clearAuthError,
    requestEmailOtp,
    verifyEmailOtp,
    signInWithGoogle,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
