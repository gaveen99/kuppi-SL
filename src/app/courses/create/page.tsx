'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ClassType, Level, Medium } from '@/types';
import { CLASS_TYPES, SL_DISTRICTS } from '@/lib/sriLanka';
import { useLanguage } from '@/contexts/LanguageContext';

const CATEGORIES = [
  'Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology',
  'IT', 'Computer Science', 'Engineering', 'Business', 'Medicine',
  'Language', 'Arts', 'Other'
];

export default function CreateCoursePage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'OL' as Level,
    category: 'Mathematics',
    medium: '' as Medium | '',
    district: '',
    classType: '' as ClassType | '',
    isPublished: false,
    isPremium: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!loading && (!user || user.role !== 'teacher')) {
    router.push('/auth/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError('');

    try {
      const courseData = {
        title: formData.title,
        description: formData.description,
        level: formData.level,
        category: formData.category,
        medium: formData.medium || null,
        district: formData.district || null,
        classType: formData.classType || null,
        teacherId: user.uid,
        teacherName: user.name,
        isPublished: formData.isPublished,
        isPremium: formData.isPremium,
        createdAt: Timestamp.now(),
      };

      const courseRef = await addDoc(collection(db, 'courses'), courseData);
      router.push(`/courses/${courseRef.id}`);
    } catch (err: any) {
      console.error('Error creating course:', err);
      setError(err.message || t('courseCreateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">{t('courseCreateLoading')}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('courseCreateTitle')}</h1>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="label">{t('courseCreateCourseTitle')}</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('courseCreateTitlePlaceholder')}
              className="input-field"
            />
          </div>

          <div>
            <label className="label">{t('courseCreateDescription')}</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('courseCreateDescriptionPlaceholder')}
              rows={5}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('courseCreateLevel')}</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as Level })}
                className="input-field"
              >
                <option value="OL">{t('courseCreateLevelOL')}</option>
                <option value="AL">{t('courseCreateLevelAL')}</option>
                <option value="Undergraduate">{t('courseCreateLevelUndergraduate')}</option>
                <option value="Masters">{t('courseCreateLevelMasters')}</option>
                <option value="Other">{t('courseCreateLevelOther')}</option>
              </select>
            </div>

            <div>
              <label className="label">{t('courseCreateCategory')}</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">{t('courseCreateMediumOptional')}</label>
              <select
                value={formData.medium}
                onChange={(e) => setFormData({ ...formData, medium: e.target.value as Medium | '' })}
                className="input-field"
              >
                <option value="">{t('courseCreateNotSpecified')}</option>
                <option value="Sinhala">{t('courseSharedMediumSinhala')}</option>
                <option value="Tamil">{t('courseSharedMediumTamil')}</option>
                <option value="English">{t('courseSharedMediumEnglish')}</option>
              </select>
            </div>

            <div>
              <label className="label">{t('courseCreateDistrictOptional')}</label>
              <select
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="input-field"
              >
                <option value="">{t('courseCreateNotSpecified')}</option>
                {SL_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">{t('courseCreateClassTypeOptional')}</label>
              <select
                value={formData.classType}
                onChange={(e) => setFormData({ ...formData, classType: e.target.value as ClassType | '' })}
                className="input-field"
              >
                <option value="">{t('courseCreateNotSpecified')}</option>
                {CLASS_TYPES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">
                {t('courseCreatePublishLabel')}
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isPremium}
                onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">
                {t('courseCreatePremiumLabel')}
              </span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1"
            >
              {submitting ? t('courseCreateSubmitting') : t('courseCreateSubmit')}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/teacher')}
              className="btn-secondary"
            >
              {t('courseCreateCancel')}
            </button>
          </div>

          <p className="text-sm text-gray-500">
            {t('courseCreateFooterNote')}
          </p>
        </form>
      </div>
    </div>
  );
}
