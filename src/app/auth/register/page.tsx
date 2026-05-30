'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Level, UserRole } from '@/types';

type Stage = 'form' | 'code';

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const {
    requestEmailOtp,
    verifyEmailOtp,
    signInWithGoogle,
    user,
    firebaseUser,
    loading: authLoading,
    processingRedirect,
    authError,
    clearAuthError,
  } = useAuth();

  // If auth completes (e.g., user returned from signInWithRedirect on
  // mobile) send them onward automatically.
  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) return;
    if (user && user.role && user.fieldOfStudy) {
      router.replace(`/dashboard/${user.role}`);
    } else if (firebaseUser) {
      router.replace('/auth/complete-profile');
    }
  }, [authLoading, firebaseUser, user, router]);
  const [stage, setStage] = useState<Stage>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [code, setCode] = useState('');
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student' as UserRole,
    level: 'OL' as Level,
    fieldOfStudy: '',
    institution: '',
  });

  // Prefill the email field if we were redirected here with ?email=foo
  // (e.g. the login page bounced an unregistered user over to register).
  // Runs once on mount; formData remains the source of truth thereafter.
  useEffect(() => {
    const prefill = searchParams?.get('email');
    if (prefill) {
      setFormData((prev) => ({ ...prev, email: prefill }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    const int = setInterval(() => {
      setCooldown((n) => {
        if (n <= 1) {
          clearInterval(int);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const sendCode = async () => {
    setError('');
    setInfo('');
    const wasOnCodeStage = stage === 'code';
    try {
      const res = await requestEmailOtp(formData.email, 'signup');
      setInfo(
        `${t('authOtpSentPrefix')} ${formData.email}. ${t('authOtpSentExpiresIn')} ${res.expiresInMinutes} ${t('authOtpSentMinutes')} ${t('authOtpSentSpamHint')}`
      );
      setStage('code');
      startCooldown(60);
      // Only refocus on resend; the initial transition relies on the input's autoFocus.
      if (wasOnCodeStage) {
        codeInputRef.current?.focus();
      }
    } catch (err: any) {
      if (err?.code === 'already_registered') {
        // Email is already a user — send them to sign in with the email
        // carried forward so they don't have to retype it.
        setInfo('This email is already registered. Taking you to sign in…');
        setTimeout(() => {
          router.push(
            `/auth/login?email=${encodeURIComponent(formData.email)}`
          );
        }, 1500);
        return;
      }
      setError(err.message || t('authCouldNotSendCode'));
    }
  };

  const handleResendCode = async () => {
    setSubmitting(true);
    try {
      await sendCode();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setError(t('registerFillNameEmail'));
      return;
    }
    setSubmitting(true);
    try {
      await sendCode();
    } finally {
      setSubmitting(false);
    }
  };

  const verifyNow = async () => {
    setError('');
    if (!/^\d{6}$/.test(code)) {
      setError(t('authEnter6DigitCode'));
      return;
    }
    setSubmitting(true);
    try {
      await verifyEmailOtp(formData.email, code, {
        name: formData.name,
        role: formData.role,
        level: formData.level,
        fieldOfStudy: formData.fieldOfStudy,
        institution: formData.institution,
      });
      router.push(`/dashboard/${formData.role}`);
    } catch (err: any) {
      setError(err.message || t('authVerificationFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyNow();
  };

  // Auto-submit when the 6th digit lands (typed or pasted) so users don't
  // have to also click Verify.
  useEffect(() => {
    if (stage !== 'code') return;
    if (submitting) return;
    if (code.length !== 6) return;
    verifyNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, stage, submitting]);

  const handleGoogle = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await signInWithGoogle({
        name: formData.name || undefined,
        role: formData.role,
        level: formData.level,
        fieldOfStudy: formData.fieldOfStudy || undefined,
        institution: formData.institution || undefined,
      });
      if (res.isNewUser) {
        router.push('/auth/complete-profile');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || t('authGoogleSignInFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Hide the form while sign-in is completing — either we just returned from
  // a Google signInWithRedirect (processingRedirect) or auth state is already
  // populated and the redirect-out effect above is about to fire. Without
  // this, the full form is visible for 1–3 s before the redirect lands.
  if (processingRedirect || firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center" role="status" aria-live="polite">
          <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">{t('authSigningYouIn')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto shadow-lg">
              K
            </div>
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold text-gray-900">
            {t('registerTitle')}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {t('registerSubtitle')}
          </p>
        </div>

        <div className="card space-y-4">
          {(error || authError) && (
            <div
              role="alert"
              aria-live="assertive"
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm"
            >
              {error || authError}
              {authError && (
                <button
                  type="button"
                  onClick={clearAuthError}
                  aria-label={t('authDismissError')}
                  className="ml-2 underline text-xs"
                >
                  {t('authDismiss')}
                </button>
              )}
            </div>
          )}
          {info && (
            <div
              role="status"
              aria-live="polite"
              className="bg-primary-50 border border-primary-200 text-primary-800 px-4 py-2 rounded text-sm"
            >
              {info}
            </div>
          )}

          {stage === 'form' ? (
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="label">{t('registerNameLabel')}</label>
                <input
                  type="text"
                  name="name"
                  required
                  autoComplete="name"
                  autoCapitalize="words"
                  value={formData.name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder={t('registerNamePlaceholder')}
                />
              </div>
              <div>
                <label className="label">{t('authEmailLabel')}</label>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field"
                  placeholder={t('authEmailPlaceholder')}
                />
              </div>
              <div>
                <label className="label">{t('registerIamA')}</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="student">{t('registerStudent')}</option>
                  <option value="teacher">{t('registerTeacher')}</option>
                  <option value="parent">{t('registerParent')}</option>
                </select>
              </div>
              <div>
                <label className="label">{t('registerLevelLabel')}</label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="OL">{t('registerLevelOL')}</option>
                  <option value="AL">{t('registerLevelAL')}</option>
                  <option value="Undergraduate">{t('registerLevelUndergraduate')}</option>
                  <option value="Masters">{t('registerLevelMasters')}</option>
                  <option value="Other">{t('registerLevelOther')}</option>
                </select>
              </div>
              <div>
                <label className="label">{t('registerFieldOfStudy')}</label>
                <input
                  type="text"
                  name="fieldOfStudy"
                  autoCapitalize="words"
                  value={formData.fieldOfStudy}
                  onChange={handleChange}
                  className="input-field"
                  placeholder={t('registerFieldPlaceholder')}
                />
              </div>
              <div>
                <label className="label">{t('registerInstitution')}</label>
                <input
                  type="text"
                  name="institution"
                  autoComplete="organization"
                  autoCapitalize="words"
                  value={formData.institution}
                  onChange={handleChange}
                  className="input-field"
                  placeholder={t('registerInstitutionPlaceholder')}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting ? t('authSendingCode') : t('authSendCodeButton')}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-500">{t('authOr')}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700 shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                </svg>
                {t('authContinueWithGoogle')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="label">{t('authCodeLabel')}</label>
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="input-field text-center text-2xl font-mono tracking-[0.4em]"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('authCodePastHint')}
                </p>
                <div className="flex justify-between mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStage('form');
                      setCode('');
                      setInfo('');
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {t('registerChangeDetails')}
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={cooldown > 0 || submitting}
                    className="text-xs text-primary-600 hover:text-primary-700 disabled:text-gray-400"
                  >
                    {cooldown > 0 ? `${t('authResendIn')} ${cooldown}${t('authResendSeconds')}` : t('authResendCode')}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting || code.length !== 6}
                className="btn-primary w-full"
              >
                {submitting ? t('registerCreatingAccount') : t('registerVerifyCreate')}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-600">
          {t('registerAlreadyHaveAccount')}{' '}
          <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 font-medium">
            {t('registerSignIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  );
}
