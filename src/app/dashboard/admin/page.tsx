'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">{t('loading')}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('dashAdminTitle')}</h1>
          <p className="text-gray-600 mt-2">{t('dashAdminSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashAdminCourses')}</h3>
            <p className="text-gray-600 text-sm mb-4">{t('dashAdminCoursesDesc')}</p>
            <button className="btn-primary w-full">{t('dashAdminViewCourses')}</button>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashAdminUsers')}</h3>
            <p className="text-gray-600 text-sm mb-4">{t('dashAdminUsersDesc')}</p>
            <Link href="/dashboard/admin/teachers" className="btn-primary block text-center">
              {t('dashAdminVerifyTeachers')}
            </Link>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashAdminAnnouncements')}</h3>
            <p className="text-gray-600 text-sm mb-4">{t('dashAdminAnnouncementsDesc')}</p>
            <div className="space-y-2">
              <Link href="/announcements/create" className="btn-primary block text-center">
                {t('dashAdminCreateAnnouncement')}
              </Link>
              <Link href="/announcements" className="btn-secondary block text-center">
                {t('dashAdminViewAll')}
              </Link>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashAdminTeacherOffers')}</h3>
            <p className="text-gray-600 text-sm mb-4">{t('dashAdminTeacherOffersDesc')}</p>
            <button className="btn-primary w-full">{t('dashAdminViewOffers')}</button>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashAdminLearnRequests')}</h3>
            <p className="text-gray-600 text-sm mb-4">{t('dashAdminLearnRequestsDesc')}</p>
            <button className="btn-primary w-full">{t('dashAdminViewRequests')}</button>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashAdminReports')}</h3>
            <p className="text-gray-600 text-sm mb-4">{t('dashAdminReportsDesc')}</p>
            <button className="btn-secondary w-full" disabled>{t('dashAdminComingSoon')}</button>
          </div>
        </div>

        <div className="mt-8 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashAdminNote')}</h3>
          <p className="text-gray-600">
            {t('dashAdminNoteBody')}
          </p>
        </div>
      </div>
    </div>
  );
}
