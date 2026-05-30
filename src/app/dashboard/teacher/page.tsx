'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Course, TeacherOffer } from '@/types';

export default function TeacherDashboard() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [myOffers, setMyOffers] = useState<TeacherOffer[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'teacher')) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role === 'teacher') {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch teacher's courses
      const coursesQuery = query(
        collection(db, 'courses'),
        where('teacherId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setMyCourses(courses);

      // Fetch teacher's offers
      const offersQuery = query(
        collection(db, 'teacherOffers'),
        where('teacherId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const offersSnapshot = await getDocs(offersQuery);
      const offers = offersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherOffer));
      setMyOffers(offers);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">{t('loading')}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('dashCommonWelcomeBack')} {user.name}</h1>
          <p className="text-gray-600 mt-2">{t('dashTeacherRole')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* My Courses */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{t('dashTeacherMyCourses')}</h2>
                <Link href="/courses/create" className="btn-primary">
                  {t('dashTeacherCreateNewCourse')}
                </Link>
              </div>

              {dataLoading ? (
                <div className="text-center py-8">{t('loading')}</div>
              ) : myCourses.length > 0 ? (
                <div className="space-y-4">
                  {myCourses.map((course) => (
                    <div key={course.id} className="card">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">{course.title}</h3>
                            <span className={`text-xs px-2 py-1 rounded ${course.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {course.isPublished ? t('dashTeacherPublished') : t('dashTeacherDraft')}
                            </span>
                            {course.isPremium && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                {t('dashTeacherPremium')}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mb-3">{course.description}</p>
                          <div className="flex gap-2">
                            <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                              {course.level}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                              {course.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Link href={`/courses/${course.id}/edit`} className="btn-secondary text-sm">
                            {t('dashTeacherEdit')}
                          </Link>
                          <Link href={`/courses/${course.id}`} className="btn-outline text-sm">
                            {t('dashTeacherView')}
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card text-center py-8">
                  <p className="text-gray-500 mb-4">{t('dashTeacherNoCoursesYet')}</p>
                  <Link href="/courses/create" className="btn-primary inline-block">
                    {t('dashTeacherCreateYourFirstCourse')}
                  </Link>
                </div>
              )}
            </section>

            {/* My Teacher Offers */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{t('dashTeacherMyTeachingOffers')}</h2>
                <Link href="/teach" className="btn-primary">
                  {t('dashTeacherCreateNewOffer')}
                </Link>
              </div>

              {dataLoading ? (
                <div className="text-center py-8">{t('loading')}</div>
              ) : myOffers.length > 0 ? (
                <div className="space-y-4">
                  {myOffers.map((offer) => (
                    <div key={offer.id} className="card">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{offer.title}</h3>
                            <span className={`text-xs px-2 py-1 rounded ${offer.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {offer.isActive ? t('dashTeacherActive') : t('dashTeacherInactive')}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{offer.description}</p>
                          <div className="flex gap-2 mb-2">
                            <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                              {offer.level}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                              {offer.category}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {offer.mode}
                            </span>
                          </div>
                        </div>
                        <Link href="/teach" className="btn-secondary text-sm ml-4">
                          {t('dashTeacherEdit')}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card text-center py-8">
                  <p className="text-gray-500 mb-4">{t('dashTeacherNoOffersYet')}</p>
                  <Link href="/teach" className="btn-primary inline-block">
                    {t('dashTeacherCreateYourFirstOffer')}
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashCommonQuickActions')}</h3>
              <div className="space-y-2">
                <Link href="/courses/create" className="block btn-primary text-center">
                  {t('dashTeacherCreateCourse')}
                </Link>
                <Link href="/teach" className="block btn-outline text-center">
                  {t('dashTeacherCreateOffer')}
                </Link>
                <Link href="/announcements/create" className="block btn-primary text-center">
                  {t('dashTeacherCreateAnnouncement')}
                </Link>
                <Link href="/requests" className="block btn-secondary text-center">
                  {t('dashTeacherViewLearnRequests')}
                </Link>
                <Link href="/messages" className="block btn-secondary text-center">
                  {t('dashTeacherMessages')}
                </Link>
              </div>
            </div>

            {/* Statistics */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashCommonStatistics')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('dashTeacherTotalCourses')}</span>
                  <span className="font-semibold text-gray-900">{myCourses.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('dashTeacherPublishedCount')}</span>
                  <span className="font-semibold text-green-600">
                    {myCourses.filter(c => c.isPublished).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('dashTeacherActiveOffers')}</span>
                  <span className="font-semibold text-blue-600">
                    {myOffers.filter(o => o.isActive).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
