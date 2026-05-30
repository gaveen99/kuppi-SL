'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Level, UserRole } from '@/types';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, firebaseUser, loading, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [role, setRole] = useState<UserRole>('student');
  const [level, setLevel] = useState<Level>('OL');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [institution, setInstitution] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/auth/login');
      return;
    }
    if (firebaseUser && !name && firebaseUser.displayName) {
      setName(firebaseUser.displayName);
    }
    // If user doc already has a meaningful role & level, go home.
    if (user && user.role && user.fieldOfStudy) {
      router.push(`/dashboard/${user.role}`);
    }
    if (user) {
      if (user.name) setName(user.name);
      setRole(user.role || 'student');
      setLevel(user.level || 'OL');
      setFieldOfStudy(user.fieldOfStudy || '');
      setInstitution(user.institution || '');
    }
  }, [user, firebaseUser, loading, router, name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !user) return;
    setError('');
    setSubmitting(true);
    try {
      await setDoc(
        doc(db, 'users', firebaseUser.uid),
        {
          uid: firebaseUser.uid,
          email: user.email,
          name: name.trim() || user.email.split('@')[0],
          role,
          level,
          fieldOfStudy: fieldOfStudy.trim(),
          institution: institution.trim() || null,
          createdAt: user.createdAt || Timestamp.now(),
        },
        { merge: true }
      );
      await refreshUser();
      router.push(`/dashboard/${role}`);
    } catch (err: any) {
      setError(err.message || t('completeProfileError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {t('loading')}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">
            {t('completeProfileTitle')}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {t('completeProfileSubtitle')}
          </p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">{t('registerNameLabel')}</label>
            <input
              type="text"
              required
              autoComplete="name"
              autoCapitalize="words"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">{t('registerIamA')}</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
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
              value={level}
              onChange={(e) => setLevel(e.target.value as Level)}
              className="input-field"
            >
              <option value="OL">{t('profileLevelOL')}</option>
              <option value="AL">{t('profileLevelAL')}</option>
              <option value="Undergraduate">{t('profileLevelUndergraduate')}</option>
              <option value="Masters">{t('profileLevelMasters')}</option>
              <option value="Other">{t('profileLevelOther')}</option>
            </select>
          </div>
          <div>
            <label className="label">{t('registerFieldOfStudy')}</label>
            <input
              type="text"
              autoCapitalize="words"
              value={fieldOfStudy}
              onChange={(e) => setFieldOfStudy(e.target.value)}
              className="input-field"
              placeholder={t('registerFieldPlaceholder')}
            />
          </div>
          <div>
            <label className="label">{t('registerInstitution')}</label>
            <input
              type="text"
              autoComplete="organization"
              autoCapitalize="words"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="input-field"
              placeholder={t('registerInstitutionPlaceholder')}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full"
          >
            {submitting ? t('completeProfileSaving') : t('completeProfileContinue')}
          </button>
        </form>
      </div>
    </div>
  );
}
