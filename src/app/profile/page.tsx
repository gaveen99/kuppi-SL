'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SL_DISTRICTS } from '@/lib/sriLanka';
import type { Level, Medium, PreferredLanguage, UserRole } from '@/types';

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as any).toDate === 'function') {
    try {
      return (value as any).toDate();
    } catch {
      return null;
    }
  }
  return null;
}

function initials(name?: string, email?: string): string {
  const source = (name || email || '').trim();
  if (!source) return '?';
  const parts = source.split(/\s+/).slice(0, 2);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, firebaseUser, loading, refreshUser, signOut } = useAuth();
  const { t } = useLanguage();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [level, setLevel] = useState<Level>('OL');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [institution, setInstitution] = useState('');
  const [district, setDistrict] = useState('');
  const [medium, setMedium] = useState<Medium | ''>('');
  const [preferredLanguage, setPreferredLanguage] = useState<PreferredLanguage>('en');

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.push('/auth/login');
      return;
    }
    if (!user) return;
    setName(user.name || '');
    setRole(user.role || 'student');
    setLevel(user.level || 'OL');
    setFieldOfStudy(user.fieldOfStudy || '');
    setInstitution(user.institution || '');
    setDistrict(user.district || '');
    setMedium((user.medium as Medium) || '');
    setPreferredLanguage((user.preferredLanguage as PreferredLanguage) || 'en');
  }, [user, firebaseUser, loading, router]);

  const memberSince = useMemo(() => {
    const d = toDate(user?.createdAt);
    return d
      ? d.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '—';
  }, [user?.createdAt]);

  const photoURL = firebaseUser?.photoURL || null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !user) return;
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const trimmedName = name.trim() || user.email.split('@')[0];
      const patch: Record<string, unknown> = {
        name: trimmedName,
        role,
        level,
        fieldOfStudy: fieldOfStudy.trim(),
        institution: institution.trim() || null,
        district: district || null,
        medium: medium || null,
        preferredLanguage,
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), patch, { merge: true });
      await refreshUser();
      setEditing(false);
      setSuccess(t('profileSaved'));
    } catch (err: any) {
      setError(err?.message || t('profileSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
    if (user) {
      setName(user.name || '');
      setRole(user.role || 'student');
      setLevel(user.level || 'OL');
      setFieldOfStudy(user.fieldOfStudy || '');
      setInstitution(user.institution || '');
      setDistrict(user.district || '');
      setMedium((user.medium as Medium) || '');
      setPreferredLanguage((user.preferredLanguage as PreferredLanguage) || 'en');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  if (loading || !firebaseUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-600">
          {t('loading')}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('profileFinishSetupTitle')}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('profileFinishSetupBody')}
          </p>
          <Link href="/auth/complete-profile" className="btn-primary">
            {t('profileFinishSetupCta')}
          </Link>
        </div>
      </div>
    );
  }

  const roleLabel =
    role === 'student'
      ? t('profileRoleStudent')
      : role === 'teacher'
        ? t('profileRoleTeacher')
        : role === 'parent'
          ? t('profileRoleParent')
          : role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900">{t('profileTitle')}</h1>
          {!editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setSuccess('');
              }}
              className="btn-primary"
            >
              {t('profileEdit')}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}
        {success && !editing && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded text-sm">
            {success}
          </div>
        )}

        <div className="card">
          <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
            {photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoURL}
                alt={user.name}
                className="w-16 h-16 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center text-xl font-bold">
                {initials(user.name, user.email)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xl font-bold text-gray-900 truncate">
                {user.name}
              </p>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
              <p className="text-xs text-gray-400 mt-1">
                {roleLabel} · {t('profileMemberSince')} {memberSince}
              </p>
            </div>
          </div>

          {!editing ? (
            <dl className="divide-y divide-gray-100">
              <InfoRow label={t('profileNameLabel')} value={user.name} />
              <InfoRow label={t('profileEmailLabel')} value={user.email} />
              <InfoRow label={t('profileRoleLabel')} value={roleLabel} />
              <InfoRow label={t('profileLevelLabel')} value={formatLevel(user.level, t)} />
              <InfoRow label={t('profileFieldOfStudy')} value={user.fieldOfStudy || t('profileNoValue')} />
              <InfoRow label={t('profileInstitution')} value={user.institution || t('profileNoValue')} />
              <InfoRow label={t('profileDistrict')} value={user.district || t('profileNoValue')} />
              <InfoRow label={t('profileMedium')} value={user.medium || t('profileNoValue')} />
              <InfoRow
                label={t('profilePreferredLanguage')}
                value={formatLanguage(user.preferredLanguage, t)}
              />
            </dl>
          ) : (
            <form onSubmit={handleSave} className="pt-6 space-y-4">
              <div>
                <label className="label">{t('profileNameLabel')}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">{t('profileIamA')}</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="input-field"
                >
                  <option value="student">{t('profileStudent')}</option>
                  <option value="teacher">{t('profileTeacher')}</option>
                  <option value="parent">{t('profileParent')}</option>
                </select>
              </div>
              <div>
                <label className="label">{t('profileLevelLabel')}</label>
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
                <label className="label">{t('profileFieldOfStudy')}</label>
                <input
                  type="text"
                  value={fieldOfStudy}
                  onChange={(e) => setFieldOfStudy(e.target.value)}
                  className="input-field"
                  placeholder={t('profileFieldPlaceholder')}
                />
              </div>
              <div>
                <label className="label">{t('profileInstitutionOptional')}</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="input-field"
                  placeholder={t('profileInstitutionPlaceholder')}
                />
              </div>
              <div>
                <label className="label">{t('profileDistrictOptional')}</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="input-field"
                >
                  <option value="">{t('profileSelectDistrict')}</option>
                  {SL_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('profileMediumOptional')}</label>
                <select
                  value={medium}
                  onChange={(e) => setMedium(e.target.value as Medium | '')}
                  className="input-field"
                >
                  <option value="">{t('profileSelectMedium')}</option>
                  <option value="Sinhala">{t('profileMediumSinhala')}</option>
                  <option value="Tamil">{t('profileMediumTamil')}</option>
                  <option value="English">{t('profileMediumEnglish')}</option>
                </select>
              </div>
              <div>
                <label className="label">{t('profilePreferredLanguage')}</label>
                <select
                  value={preferredLanguage}
                  onChange={(e) =>
                    setPreferredLanguage(e.target.value as PreferredLanguage)
                  }
                  className="input-field"
                >
                  <option value="en">{t('profileLangEnglish')}</option>
                  <option value="si">{t('profileLangSinhala')}</option>
                  <option value="ta">{t('profileLangTamil')}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? t('profileSaving') : t('profileSaveChanges')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
                >
                  {t('profileCancel')}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3 justify-between items-center">
          <Link
            href={`/dashboard/${user.role}`}
            className="text-primary-600 hover:underline text-sm font-medium"
          >
            {t('profileBackToDashboard')}
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-red-600 hover:underline"
          >
            {t('profileSignOut')}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-3">
      <dt className="sm:w-1/3 text-sm font-medium text-gray-500">{label}</dt>
      <dd className="sm:w-2/3 text-sm text-gray-900 break-words">{value}</dd>
    </div>
  );
}

function formatLevel(level: string | undefined, t: (k: any) => string): string {
  if (!level) return t('profileNoValue');
  if (level === 'OL') return t('profileLevelOL');
  if (level === 'AL') return t('profileLevelAL');
  if (level === 'Undergraduate') return t('profileLevelUndergraduate');
  if (level === 'Masters') return t('profileLevelMasters');
  if (level === 'Other') return t('profileLevelOther');
  return level;
}

function formatLanguage(code: string | undefined, t: (k: any) => string): string {
  if (code === 'si') return t('profileLangSinhala');
  if (code === 'ta') return t('profileLangTamil');
  return t('profileLangEnglish');
}
