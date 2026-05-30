'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Level } from '@/types';

export default function CreateAnnouncementPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    targetLevel: '' as Level | '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && (!user || !['admin', 'teacher'].includes(user.role))) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError('');

    try {
      await addDoc(collection(db, 'announcements'), {
        title: formData.title,
        body: formData.body,
        targetLevel: formData.targetLevel || null,
        createdAt: Timestamp.now(),
        createdBy: user.uid,
        createdByName: user.name,
      });

      router.push('/announcements');
    } catch (err: any) {
      console.error('Error creating announcement:', err);
      setError(err.message || t('announcementCreateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">{t('announcementCreateLoading')}</div>;
  }

  if (!['admin', 'teacher'].includes(user.role)) {
    return <div className="min-h-screen flex items-center justify-center">{t('announcementCreateAccessDenied')}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('announcementCreateTitle')}</h1>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="label">{t('announcementCreateTitleLabel')}</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('announcementCreateTitlePlaceholder')}
              className="input-field"
            />
          </div>

          <div>
            <label className="label">{t('announcementCreateMessageLabel')}</label>
            <textarea
              required
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder={t('announcementCreateMessagePlaceholder')}
              rows={8}
              className="input-field"
            />
          </div>

          <div>
            <label className="label">{t('announcementCreateAudienceLabel')}</label>
            <select
              value={formData.targetLevel}
              onChange={(e) => setFormData({ ...formData, targetLevel: e.target.value as Level | '' })}
              className="input-field"
            >
              <option value="">{t('announcementCreateAudienceAll')}</option>
              <option value="OL">{t('announcementCreateAudienceOL')}</option>
              <option value="AL">{t('announcementCreateAudienceAL')}</option>
              <option value="Undergraduate">{t('announcementCreateAudienceUndergraduate')}</option>
              <option value="Masters">{t('announcementCreateAudienceMasters')}</option>
              <option value="Other">{t('announcementCreateAudienceOther')}</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              {t('announcementCreateAudienceHint')}
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1"
            >
              {submitting ? t('announcementCreateSubmitting') : t('announcementCreateSubmit')}
            </button>
            <button
              type="button"
              onClick={() => router.push('/announcements')}
              className="btn-secondary"
            >
              {t('announcementCreateCancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
