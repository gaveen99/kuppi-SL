'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Course, Level, Medium } from '@/types';

const CATEGORIES = [
  'Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology',
  'IT', 'Computer Science', 'Engineering', 'Business', 'Medicine',
  'Language', 'Arts', 'Other'
];

export default function EditCoursePage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'OL' as Level,
    category: 'Mathematics',
    medium: '' as Medium | '',
    isPublished: false,
    isPremium: false,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const courseDoc = await getDoc(doc(db, 'courses', params.id));
        if (!courseDoc.exists()) {
          router.push('/courses');
          return;
        }
        const courseData = { id: courseDoc.id, ...courseDoc.data() } as Course;
        setCourse(courseData);
        setFormData({
          title: courseData.title,
          description: courseData.description,
          level: courseData.level,
          category: courseData.category,
          medium: courseData.medium || '',
          isPublished: courseData.isPublished,
          isPremium: courseData.isPremium,
        });
      } catch (error) {
        console.error('Error fetching course:', error);
        setError(t('courseEditFailedToLoad'));
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [params.id, router]);

  // Check if user is authorized
  useEffect(() => {
    if (!authLoading && !loading && course) {
      if (!user || user.uid !== course.teacherId) {
        router.push(`/courses/${params.id}`);
      }
    }
  }, [user, authLoading, loading, course, router, params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !course) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'courses', params.id), {
        title: formData.title,
        description: formData.description,
        level: formData.level,
        category: formData.category,
        medium: formData.medium || null,
        isPublished: formData.isPublished,
        isPremium: formData.isPremium,
        updatedAt: Timestamp.now(),
      });
      setSuccess(t('courseEditUpdateSuccess'));
      setTimeout(() => {
        router.push(`/courses/${params.id}`);
      }, 1500);
    } catch (err: any) {
      console.error('Error updating course:', err);
      setError(err.message || t('courseEditUpdateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('courseEditDeleteConfirm'))) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await deleteDoc(doc(db, 'courses', params.id));
      router.push('/dashboard/teacher');
    } catch (err: any) {
      console.error('Error deleting course:', err);
      setError(err.message || t('courseEditDeleteCourse'));
      setDeleting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-12">{t('loading')}</div>
      </div>
    );
  }

  if (!course || !user || user.uid !== course.teacherId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-12">{t('courseEditNotAuthorized')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('courseSharedEditCourse')}</h1>
          <button
            onClick={() => router.push(`/courses/${params.id}`)}
            className="text-gray-600 hover:text-gray-900"
          >
            {t('courseEditBackToCourse')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <div>
            <label className="label">{t('courseEditCourseTitle')}</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('courseEditTitlePlaceholder')}
              className="input-field"
            />
          </div>

          <div>
            <label className="label">{t('courseEditDescription')}</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('courseEditDescriptionPlaceholder')}
              rows={5}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('courseEditLevel')}</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as Level })}
                className="input-field"
              >
                <option value="OL">{t('courseEditLevelOL')}</option>
                <option value="AL">{t('courseEditLevelAL')}</option>
                <option value="Undergraduate">{t('courseEditLevelUndergraduate')}</option>
                <option value="Masters">{t('courseEditLevelMasters')}</option>
                <option value="Other">{t('courseEditLevelOther')}</option>
              </select>
            </div>

            <div>
              <label className="label">{t('courseEditCategory')}</label>
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
              <label className="label">{t('courseEditMediumOptional')}</label>
              <select
                value={formData.medium}
                onChange={(e) => setFormData({ ...formData, medium: e.target.value as Medium | '' })}
                className="input-field"
              >
                <option value="">{t('courseEditNotSpecified')}</option>
                <option value="Sinhala">{t('courseSharedMediumSinhala')}</option>
                <option value="Tamil">{t('courseSharedMediumTamil')}</option>
                <option value="English">{t('courseSharedMediumEnglish')}</option>
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
                {t('courseEditPublishLabel')}
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
                {t('courseEditPremiumLabel')}
              </span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1"
            >
              {submitting ? t('courseEditSaving') : t('courseEditSaveChanges')}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/courses/${params.id}`)}
              className="btn-secondary"
            >
              {t('courseEditCancel')}
            </button>
          </div>
        </form>

        {/* Danger Zone */}
        <div className="card mt-8 border-red-200">
          <h2 className="text-lg font-semibold text-red-600 mb-4">{t('courseEditDangerZone')}</h2>
          <p className="text-sm text-gray-600 mb-4">
            {t('courseEditDangerDescription')}
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? t('courseEditDeleting') : t('courseEditDeleteCourse')}
          </button>
        </div>
      </div>
    </div>
  );
}
